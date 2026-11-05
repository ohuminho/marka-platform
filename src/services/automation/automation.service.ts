import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";

type JsonRecord = Record<string, unknown>;
function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function atPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => record(current) ? current[key] : undefined, value);
}
function conditionsMatch(conditions: unknown, payload: unknown): boolean {
  if (conditions == null) return true;
  if (!Array.isArray(conditions) || conditions.length > 20) return false;
  return conditions.every((condition) => record(condition)
    && typeof condition.field === "string"
    && atPath(payload, condition.field) === condition.equals);
}
function actionsFrom(value: unknown): Array<{ userId?: string; userIdField?: string; title: string; message: string; type?: string }> | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) return null;
  const result = [];
  for (const action of value) {
    if (!record(action) || action.type !== "notify_user"
      || typeof action.title !== "string" || action.title.trim().length < 2 || action.title.length > 120
      || typeof action.message !== "string" || action.message.trim().length < 2 || action.message.length > 1000
      || (action.userId !== undefined && typeof action.userId !== "string")
      || (action.userIdField !== undefined && typeof action.userIdField !== "string")) return null;
    result.push({
      title: action.title.trim(), message: action.message.trim(),
      ...(typeof action.userId === "string" ? { userId: action.userId } : {}),
      ...(typeof action.userIdField === "string" ? { userIdField: action.userIdField } : {}),
      ...(typeof action.notificationType === "string" ? { type: action.notificationType.slice(0, 40) } : {}),
    });
  }
  return result;
}

export class AutomationService {
  async run(event: string, payload: JsonRecord = {}) {
    const eventType = event.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_.]{1,79}$/.test(eventType)) throw new Error("Invalid automation event type.");
    return prisma.domainEvent.create({
      data: {
        eventKey: `automation:${randomUUID()}`,
        aggregateType: "MARKA",
        aggregateId: "PLATFORM",
        eventType,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  async processPending(limit = 20) {
    // A crashed serverless worker can leave an event claimed forever. The
    // platform worker budget is far below this lease, so recover old claims.
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.domainEvent.updateMany({
      where: { status: "PROCESSING", createdAt: { lte: staleBefore } },
      data: {
        status: "PENDING",
        availableAt: new Date(),
        lastError: "Recovered an expired processing claim.",
      },
    });

    const candidates = await prisma.domainEvent.findMany({
      where: { status: "PENDING", availableAt: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
      take: Math.min(Math.max(Math.floor(limit), 1), 50),
      select: { id: true, eventType: true, payload: true, attempts: true },
    });
    const result = { claimed: 0, processed: 0, failed: 0, skipped: 0 };

    for (const event of candidates) {
      const claim = await prisma.domainEvent.updateMany({
        where: { id: event.id, status: "PENDING", availableAt: { lte: new Date() } },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });
      if (claim.count !== 1) continue;
      result.claimed++;

      try {
        const eventPayload = record(event.payload) ? event.payload : {};
        const organizationId = typeof eventPayload.organizationId === "string"
          ? eventPayload.organizationId
          : null;
        const rules = await prisma.automationRule.findMany({
          where: {
            status: "ACTIVE",
            trigger: event.eventType,
            ...(organizationId
              ? { OR: [{ organizationId: null }, { organizationId }] }
              : { organizationId: null }),
          },
          orderBy: { priority: "asc" },
          take: 50,
          select: { id: true, conditions: true, actions: true },
        });
        for (const rule of rules) {
          const key = `domain-event:${event.id}:rule:${rule.id}`;
          if (!conditionsMatch(rule.conditions, eventPayload)) {
            await prisma.automationExecution.upsert({
              where: { idempotencyKey: key },
              create: { ruleId: rule.id, idempotencyKey: key, status: "SKIPPED", input: { eventId: event.id } },
              update: {},
            });
            result.skipped++;
            continue;
          }
          const actions = actionsFrom(rule.actions);
          if (!actions) {
            await prisma.automationExecution.upsert({
              where: { idempotencyKey: key },
              create: { ruleId: rule.id, idempotencyKey: key, status: "FAILED", input: { eventId: event.id }, errorMessage: "Unsupported action configuration." },
              update: {},
            });
            result.skipped++;
            continue;
          }
          const prior = await prisma.automationExecution.findUnique({ where: { idempotencyKey: key }, select: { status: true } });
          if (prior?.status === "SUCCEEDED" || prior?.status === "SKIPPED") continue;
          const execution = await prisma.automationExecution.upsert({
            where: { idempotencyKey: key },
            create: { ruleId: rule.id, idempotencyKey: key, status: "RUNNING", input: { eventId: event.id }, startedAt: new Date() },
            update: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
          });
          try {
            const payload = eventPayload;
            await prisma.$transaction(async (tx) => {
              const created: Array<{ action: string; notificationId: string }> = [];
              for (const action of actions) {
                const userId = action.userId ?? (action.userIdField ? atPath(payload, action.userIdField) : payload.userId);
                if (typeof userId !== "string" || !userId) throw new Error("Notification target user is missing.");
                const sent = await tx.notification.create({
                  data: {
                    userId, title: action.title, message: action.message,
                    type: action.type ?? "AUTOMATION",
                    data: { eventId: event.id, ruleId: rule.id },
                  },
                });
                created.push({ action: "notify_user", notificationId: sent.id });
              }
              await tx.automationExecution.update({
                where: { id: execution.id },
                data: { status: "SUCCEEDED", output: created as Prisma.InputJsonArray, completedAt: new Date(), errorMessage: null },
              });
              return created;
            });
          } catch (error) {
            await prisma.automationExecution.update({
              where: { id: execution.id },
              data: { status: "FAILED", errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Action failed.", completedAt: new Date() },
            });
            throw error;
          }
        }
        await prisma.domainEvent.update({
          where: { id: event.id },
          data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
        });
        result.processed++;
      } catch (error) {
        const attempts = event.attempts + 1;
        await prisma.domainEvent.update({
          where: { id: event.id },
          data: {
            status: attempts >= 5 ? "FAILED" : "PENDING",
            availableAt: new Date(Date.now() + Math.min(3600000, 2 ** attempts * 30000)),
            lastError: error instanceof Error ? error.message.slice(0, 500) : "Automation processing failed.",
          },
        });
        result.failed++;
      }
    }
    return result;
  }
}
