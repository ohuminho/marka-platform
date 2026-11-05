import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";

/**
 * Durable internal event intake. Consumers process DomainEvent records and
 * AutomationRule definitions; this class never executes arbitrary code from DB.
 */
export class AutomationService {
  async run(event: string, payload: Record<string, unknown> = {}) {
    const eventType = event.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_.]{1,79}$/.test(eventType)) {
      throw new Error("Invalid automation event type.");
    }
    const id = randomUUID();
    return prisma.domainEvent.create({
      data: {
        eventKey: `automation:${id}`,
        aggregateType: "MARKA",
        aggregateId: "PLATFORM",
        eventType,
        payload: {
          source: "MARKA_AUTOMATION",
          ...payload,
        } as Prisma.InputJsonValue,
      },
    });
  }
}
