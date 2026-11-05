import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { reserveApiRequest } from "@/core/security/api-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eventSchema = z.object({
  event: z.enum(["page_view", "marketplace_view", "product_view", "store_view", "search", "add_to_cart"]),
  consent: z.literal(true),
  visitorId: z.string().uuid(),
  path: z.string().max(300).regex(/^\\/[a-zA-Z0-9\\/_~!$&'()*+,;=:@%-]*$/),
  entityId: z.string().uuid().optional(),
  category: z.string().max(80).optional(),
}).strict();

function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim()
    ?? null;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 8192) {
      return NextResponse.json({ recorded: false, message: "O evento excede o tamanho permitido." }, { status: 413 });
    }

    let body: unknown;
    try { body = JSON.parse(rawBody); } catch {
      return NextResponse.json({ recorded: false, message: "Evento inválido." }, { status: 400 });
    }
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ recorded: false, message: "Evento inválido ou consentimento ausente." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    let user: { id: string; role: string; status: string; isFounder: boolean } | null = null;

    if (session) {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true, status: true, isFounder: true },
      });
      if (!user || user.status !== "ACTIVE") {
        return NextResponse.json({ recorded: false, message: "A conta não está activa." }, { status: 403 });
      }
    }

    const privileged = Boolean(user && (
      user.isFounder || ["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role)
    ));
    const ip = clientIp(request);
    const quota = await reserveApiRequest({
      scope: "GROWTH_EVENTS",
      ...(user ? { actorUserId: user.id } : {}),
      ...(!user ? { anonymousIdentity: ip ? `${ip}:${parsed.data.visitorId}` : `visitor:${parsed.data.visitorId}` } : {}),
      bypass: privileged,
      windows: user
        ? [
            { limit: 120, windowMs: 60_000 },
            { limit: 2000, windowMs: 60 * 60 * 1000 },
          ]
        : [
            { limit: 60, windowMs: 60_000 },
            { limit: 300, windowMs: 60 * 60 * 1000 },
          ],
    });
    if (!quota.allowed) {
      return NextResponse.json(
        { recorded: false, message: "Limite temporário de eventos atingido.", retryAfterSeconds: quota.retryAfterSeconds },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(quota.retryAfterSeconds) } },
      );
    }

    const visitorId = user?.id ?? parsed.data.visitorId;
    const eventId = randomUUID();

    await prisma.domainEvent.create({
      data: {
        eventKey: `growth:${eventId}`,
        aggregateType: user ? "USER" : "ANONYMOUS_VISITOR",
        aggregateId: visitorId,
        eventType: `GROWTH.${parsed.data.event.toUpperCase()}`,
        payload: {
          visitorId: parsed.data.visitorId,
          authenticated: Boolean(user),
          path: parsed.data.path,
          ...(parsed.data.entityId ? { entityId: parsed.data.entityId } : {}),
          ...(parsed.data.category ? { category: parsed.data.category } : {}),
          consented: true,
          source: "MARKA_WEB",
        },
      },
    });

    return NextResponse.json({ recorded: true, eventId }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_GROWTH_EVENT]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ recorded: false }, { status: 503 });
  }
}
