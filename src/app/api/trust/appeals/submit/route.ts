import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/database/client/prisma";
import { reserveApiRequests } from "@/core/security/api-rate-limit";
const schema = z.object({ token: z.string().min(32).max(512), appealText: z.string().trim().min(50).max(4000) });
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ message: "O recurso deve conter uma fundamentação entre 50 e 4000 caracteres e um link válido." }, { status: 400 });
    const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "appeal-submit-unknown-ip";
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const [ipQuota, tokenQuota] = await reserveApiRequests([
      { scope: "TRUST_APPEAL_SUBMIT_IP", anonymousIdentity: ip, windows: [{ limit: 10, windowMs: 3600000 }] },
      { scope: "TRUST_APPEAL_SUBMIT_TOKEN", anonymousIdentity: tokenHash, windows: [{ limit: 5, windowMs: 900000 }] },
    ]);
    if (!ipQuota.allowed || !tokenQuota.allowed) return Response.json({ message: "Demasiadas tentativas. Solicite um novo acesso ao recurso mais tarde." }, { status: 429, headers: { "Cache-Control": "no-store" } });
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"marka-trust-appeal-token:" + tokenHash})) IS NULL AS locked`;
      const issued = await tx.securityEvent.findFirst({ where: { type: "TRUST_APPEAL_TOKEN_ISSUED", correlationId: tokenHash }, orderBy: { createdAt: "desc" }, select: { id: true, actorUserId: true, metadata: true } });
      if (!issued?.actorUserId) return { error: "INVALID" as const };
      const meta = issued.metadata && typeof issued.metadata === "object" ? issued.metadata as Record<string, unknown> : {};
      const expiresAt = typeof meta.expiresAt === "string" ? new Date(meta.expiresAt) : new Date(0);
      const signalId = typeof meta.signalId === "string" ? meta.signalId : "";
      if (expiresAt <= new Date() || !signalId) return { error: "INVALID" as const };
      const used = await tx.securityEvent.findFirst({ where: { type: "TRUST_APPEAL_TOKEN_CONSUMED", correlationId: tokenHash }, select: { id: true } });
      if (used) return { error: "USED" as const };
      const user = await tx.user.findUnique({ where: { id: issued.actorUserId }, select: { id: true, status: true } });
      if (!user || user.status !== "SUSPENDED") return { error: "INELIGIBLE" as const };
      const sanction = await tx.securityEvent.findFirst({ where: { type: "TRUST_SANCTION_SUSPENDED", correlationId: user.id }, orderBy: { createdAt: "desc" }, select: { metadata: true } });
      const sanctionMeta = sanction?.metadata && typeof sanction.metadata === "object" ? sanction.metadata as Record<string, unknown> : {};
      if (sanctionMeta.signalId !== signalId) return { error: "CHANGED" as const };
      await tx.securityEvent.create({ data: { actorUserId: user.id, type: "TRUST_APPEAL_TOKEN_CONSUMED", severity: "INFO", correlationId: tokenHash, metadata: { issuedEventId: issued.id, consumedAt: new Date().toISOString() } } });
      const reference = `AP-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
      const appeal = await tx.securityEvent.create({ data: { actorUserId: user.id, type: "TRUST_APPEAL_SUBMITTED", severity: "HIGH", correlationId: user.id, metadata: { signalId, appealText: parsed.data.appealText, reference, submittedAt: new Date().toISOString() } } });
      await tx.auditLog.create({ data: { actorUserId: user.id, actorType: "USER", action: "TRUST_APPEAL_SUBMITTED", entityType: "USER", entityId: user.id, metadata: { appealEventId: appeal.id, signalId, reference } } });
      return { success: true as const, reference };
    });
    if ("error" in result) return Response.json({ message: "O acesso ao recurso é inválido, expirou ou já foi utilizado. Solicite um novo link." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    return Response.json({ message: "Recurso recebido e registado. A equipa MARKA irá analisar a fundamentação.", reference: result.reference }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[TRUST_APPEAL_SUBMIT]", error);
    return Response.json({ message: "Não foi possível registar o recurso neste momento." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}