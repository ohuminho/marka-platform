import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eventSchema = z.object({
  event: z.enum(["page_view", "marketplace_view", "product_view", "store_view", "search", "add_to_cart"]),
  consent: z.literal(true),
  visitorId: z.string().uuid(),
  path: z.string().max(300).regex(/^\/[a-zA-Z0-9\/_~!$&'()*+,;=:@%-]*$/),
  entityId: z.string().uuid().optional(),
  category: z.string().max(80).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ recorded: false, message: "Evento inválido ou consentimento ausente." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    const visitorId = session?.userId ?? parsed.data.visitorId;
    const eventId = randomUUID();

    await prisma.domainEvent.create({
      data: {
        eventKey: `growth:${eventId}`,
        aggregateType: session ? "USER" : "ANONYMOUS_VISITOR",
        aggregateId: visitorId,
        eventType: `GROWTH.${parsed.data.event.toUpperCase()}`,
        payload: {
          visitorId,
          authenticated: Boolean(session),
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
