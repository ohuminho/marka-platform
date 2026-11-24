import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/database/client/prisma";
import { reserveApiRequests } from "@/core/security/api-rate-limit";
import { markaSupportEmailService } from "@/core/communications/marka-support-email.service";
const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const generic = "Se a conta estiver suspensa e reunir as condições necessárias, receberá um e-mail com os passos para apresentar recurso.";
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ message: generic });
    const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "appeal-request-unknown-ip";
    const [ipQuota, emailQuota] = await reserveApiRequests([
      { scope: "TRUST_APPEAL_REQUEST_IP", anonymousIdentity: ip, windows: [{ limit: 5, windowMs: 3600000 }] },
      { scope: "TRUST_APPEAL_REQUEST_EMAIL", anonymousIdentity: parsed.data.email, windows: [{ limit: 3, windowMs: 86400000 }] },
    ]);
    if (!ipQuota.allowed || !emailQuota.allowed) return Response.json({ message: generic, code: "APPEAL_RATE_LIMITED" }, { status: 429, headers: { "Cache-Control": "no-store" } });
    const user = await prisma.user.findUnique({ where: { emailNormalized: parsed.data.email }, select: { id: true, email: true, name: true, status: true } });
    if (!user || user.status !== "SUSPENDED") return Response.json({ message: generic }, { headers: { "Cache-Control": "no-store" } });
    const sanction = await prisma.securityEvent.findFirst({ where: { type: "TRUST_SANCTION_SUSPENDED", correlationId: user.id }, orderBy: { createdAt: "desc" }, select: { metadata: true } });
    const sanctionMeta = sanction?.metadata && typeof sanction.metadata === "object" ? sanction.metadata as Record<string, unknown> : {};
    const signalId = typeof sanctionMeta.signalId === "string" ? sanctionMeta.signalId : null;
    if (!signalId) return Response.json({ message: generic }, { headers: { "Cache-Control": "no-store" } });
    const token = randomBytes(48).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60000);
    await prisma.securityEvent.create({ data: { actorUserId: user.id, type: "TRUST_APPEAL_TOKEN_ISSUED", severity: "INFO", correlationId: tokenHash, metadata: { userId: user.id, signalId, expiresAt: expiresAt.toISOString() } } });
    await markaSupportEmailService.send({ to: user.email, recipientName: user.name, subject: "Acesso seguro ao recurso, MARKA", title: "Pode contestar a decisão da sua conta", preheader: "Foi solicitado um acesso seguro ao processo de recurso.", message: "Recebemos um pedido para apresentar recurso da suspensão da sua conta MARKA. Utilize o acesso seguro abaixo dentro de 30 minutos. Se não fez este pedido, ignore esta mensagem.", reference: `TRUST-${signalId.slice(0, 8).toUpperCase()}`, statusLabel: "Verificação pendente", actionUrl: `/account/appeal?token=${encodeURIComponent(token)}`, idempotencyKey: `trust-appeal-access:${tokenHash}` });
    return Response.json({ message: generic }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[TRUST_APPEAL_REQUEST]", error);
    return Response.json({ message: "Não foi possível iniciar o processo de recurso. Tente novamente mais tarde." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}