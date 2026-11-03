import { createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatBody {
  prompt?: unknown;
  conversationId?: unknown;
}

interface AiCoreResponse {
  requestId?: string;
  provider?: string;
  model?: string;
  text?: string;
}

function encodeContext(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    if (!token) return jsonError("Inicia sessão para utilizar a IA do MARKA.", 401);

    const sessionService = new SessionService();
    const session = await sessionService.validate(token);
    if (!session) return jsonError("A sessão expirou. Inicia sessão novamente.", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      await sessionService.revoke(token);
      return jsonError("A conta não está activa.", 403);
    }

    const body = (await request.json().catch(() => null)) as ChatBody | null;
    if (
      !body ||
      typeof body.prompt !== "string" ||
      !body.prompt.trim() ||
      body.prompt.length > 12000
    ) {
      return jsonError("O pedido deve conter entre 1 e 12000 caracteres.", 400);
    }
    if (
      body.conversationId !== undefined &&
      (typeof body.conversationId !== "string" || body.conversationId.length > 128)
    ) {
      return jsonError("O identificador da conversa é inválido.", 400);
    }

    const baseUrl = process.env.AI_CORE_BASE_URL?.trim();
    const apiKey = process.env.AI_CORE_API_KEY?.trim();
    const signingSecret = process.env.AI_CONTEXT_SIGNING_SECRET;
    const space = process.env.AI_CORE_SPACE?.trim() || "marka";
    const issuer = process.env.AI_CONTEXT_ISSUER?.trim() || "marka-api";
    const audience = process.env.AI_CONTEXT_AUDIENCE?.trim() || "ai-core";

    if (!baseUrl || !apiKey || !signingSecret || apiKey.length < 32 || signingSecret.length < 32) {
      return jsonError("O serviço de IA ainda não está configurado para produção.", 503);
    }

    let endpoint: URL;
    try {
      endpoint = new URL("/api/v1/ai/generate", baseUrl);
    } catch {
      return jsonError("A configuração do serviço de IA é inválida.", 503);
    }
    if (process.env.NODE_ENV === "production" && endpoint.protocol !== "https:") {
      return jsonError("A ligação ao serviço de IA tem de utilizar HTTPS.", 503);
    }

    const now = Math.floor(Date.now() / 1000);
    const encodedPayload = encodeContext({
      space,
      tenantId: user.id,
      userId: user.id,
      roles: [user.role],
      iat: now,
      exp: now + 240,
      iss: issuer,
      aud: audience,
      accessLevel: "STANDARD",
    });
    const signature = createHmac("sha256", signingSecret)
      .update(encodedPayload)
      .digest("base64url");
    const contextToken = encodedPayload + "." + signature;
    const correlationId = randomUUID();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-ai-core-key": apiKey,
          "x-ai-context-token": contextToken,
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({
          space,
          operation: "CHAT",
          input: body.prompt.trim(),
          ...(typeof body.conversationId === "string"
            ? { conversationId: body.conversationId }
            : {}),
          userId: user.id,
          tenantId: user.id,
          roles: [user.role],
        }),
      });

      const raw = await upstream.text();
      if (Buffer.byteLength(raw, "utf8") > 2_000_000) {
        return jsonError("A resposta da IA excedeu o limite permitido.", 502);
      }
      const payload = raw ? (JSON.parse(raw) as AiCoreResponse) : null;

      if (!upstream.ok) {
        const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : 502;
        return jsonError(
          upstream.status === 429
            ? "O limite de utilização da IA foi atingido. Tenta novamente mais tarde."
            : "O serviço de IA não conseguiu processar o pedido.",
          status,
        );
      }
      if (!payload || typeof payload.text !== "string" || !payload.text.trim()) {
        return jsonError("O serviço de IA devolveu uma resposta inválida.", 502);
      }

      return NextResponse.json(
        {
          success: true,
          requestId: payload.requestId,
          content: payload.text.trim(),
          provider: payload.provider,
          model: payload.model,
          correlationId,
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[MARKA_AI_CHAT]", error instanceof Error ? error.message : "unknown error");
    return jsonError("Não foi possível contactar o serviço de IA. Tenta novamente.", 503);
  }
}
