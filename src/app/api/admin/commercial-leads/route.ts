import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "DISQUALIFIED",
] as const;

async function authorize() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) {
    return {
      error: NextResponse.json(
        { message: "Autenticação necessária." },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true, isFounder: true },
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !(user.isFounder || ["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role))
  ) {
    return {
      error: NextResponse.json(
        { message: "Acesso administrativo necessário." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function GET(request: Request) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;

  const requestedStatus = new URL(request.url).searchParams.get("status");
  let status: (typeof statuses)[number] | undefined;
  if (requestedStatus && requestedStatus !== "ALL") {
    const parsedStatus = z.enum(statuses).safeParse(requestedStatus);
    if (!parsedStatus.success) {
      return NextResponse.json({ message: "Filtro de estado inválido." }, { status: 400 });
    }
    status = parsedStatus.data;
  }

  try {
    const leads = await prisma.commercialLead.findMany({
      where: status ? { status } : {},
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        organizationName: true,
        leadType: true,
        message: true,
        status: true,
        internalNotes: true,
        lastContactedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        leads: leads.map((lead) => ({
          ...lead,
          createdAt: lead.createdAt.toISOString(),
          lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
        })),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[COMMERCIAL_LEADS_ADMIN_GET]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Não foi possível carregar os pedidos comerciais." }, { status: 503 });
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(statuses),
  internalNotes: z.string().max(5000).optional(),
}).strict();

export async function PATCH(request: Request) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Actualização inválida.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.commercialLead.updateMany({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.internalNotes !== undefined
          ? { internalNotes: parsed.data.internalNotes }
          : {}),
        ...(parsed.data.status === "CONTACTED"
          ? { lastContactedAt: new Date() }
          : {}),
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json({ message: "Pedido comercial não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("[COMMERCIAL_LEADS_ADMIN_PATCH]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Não foi possível actualizar o pedido." }, { status: 503 });
  }
}
