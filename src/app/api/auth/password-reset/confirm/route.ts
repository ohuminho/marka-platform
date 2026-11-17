import { z } from "zod";

import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { passwordResetService } from "@/core/authentication/password-reset.service";

const schema = z.object({
  token: z.string().min(20).max(256),
  password: z.string().min(12).max(128),
});

function clientIp(request: Request): string | undefined {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ message: "Link inválido ou expirado. Solicita uma nova recuperação." }, { status: 400 });
    }

    const ipQuota = await reserveApiRequest({
      scope: "AUTH_PASSWORD_RESET_CONFIRM_IP",
      anonymousIdentity: clientIp(request) || "password-reset-confirm-unknown-ip",
      windows: [
        { limit: 20, windowMs: 15 * 60 * 1000 },
        { limit: 100, windowMs: 60 * 60 * 1000 },
      ],
    });
    if (!ipQuota.allowed) {
      return Response.json(
        { message: "Demasiadas tentativas. Solicita um novo link mais tarde.", code: "PASSWORD_RESET_RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(ipQuota.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }

    const tokenQuota = await reserveApiRequest({
      scope: "AUTH_PASSWORD_RESET_CONFIRM_TOKEN",
      anonymousIdentity: `token:${parsed.data.token}`,
      windows: [{ limit: 5, windowMs: 15 * 60 * 1000 }],
    });
    if (!tokenQuota.allowed) {
      return Response.json(
        { message: "Link inválido ou expirado. Solicita uma nova recuperação.", code: "PASSWORD_RESET_RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(tokenQuota.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }

    const success = await passwordResetService.reset(parsed.data.token, parsed.data.password);
    if (!success) {
      return Response.json({ message: "Link inválido ou expirado. Solicita uma nova recuperação." }, { status: 400 });
    }
    return Response.json({ message: "Palavra-passe atualizada. Inicia sessão com a nova palavra-passe." });
  } catch (error) {
    console.error("[AUTH_PASSWORD_RESET_ERROR]", error);
    return Response.json({ message: "Não foi possível atualizar a palavra-passe neste momento." }, { status: 500 });
  }
}
