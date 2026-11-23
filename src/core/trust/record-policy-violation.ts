import { prisma } from "@/database/client/prisma";

export type PolicyViolationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export async function recordPolicyViolation(input: {
  userId: string;
  code: string;
  severity: PolicyViolationSeverity;
  source: "MARKETPLACE_MESSAGE" | "COMMUNICATION_MESSAGE";
}) {
  const reason = `Mensagem bloqueada pela política de conduta: ${input.code}`;
  await prisma.$transaction([
    prisma.riskSignal.create({
      data: {
        userId: input.userId,
        type: `CONDUCT_${input.code}`,
        score: input.severity === "CRITICAL" ? 90 : input.severity === "HIGH" ? 65 : input.severity === "MEDIUM" ? 35 : 15,
        source: input.source,
        entityType: "USER",
        entityId: input.userId,
        reason,
        metadata: { policyCode: input.code, severity: input.severity, blocked: true },
      },
    }),
    prisma.securityEvent.create({
      data: {
        actorUserId: input.userId,
        type: `CONDUCT_MESSAGE_BLOCKED_${input.code}`,
        severity: input.severity,
        metadata: { policyCode: input.code, source: input.source, blocked: true },
      },
    }),
  ]);
}
