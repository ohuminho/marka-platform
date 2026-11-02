import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().trim().min(1).max(80),
  activeFrom: z.string().date().optional(),
  activeUntil: z.string().date().optional(),
}).refine((rule) => rule.endTime > rule.startTime, { message: "A hora final deve ser posterior à inicial.", path: ["endTime"] })
  .refine((rule) => !rule.activeFrom || !rule.activeUntil || rule.activeUntil >= rule.activeFrom, {
    message: "A data final não pode anteceder a inicial.",
    path: ["activeUntil"],
  });

const scheduleSchema = z.object({
  productId: z.string().uuid(),
  rules: z.array(ruleSchema).min(1).max(21),
});

const exceptionSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(["CLOSED", "OPEN"]),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().max(300).optional().default(""),
});

function validTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

async function authenticatedOwner() {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  return user?.status === "ACTIVE" ? user : null;
}

async function ownedSpace(productId: string, ownerId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "ACTIVE",
      category: { name: { equals: "Imóveis e arrendamento", mode: "insensitive" }, status: "ACTIVE" },
      store: { vendor: { ownerId, status: "ACTIVE" } },
    },
    select: { id: true, name: true, attributes: true },
  });
  if (!product) return null;
  const attributes = product.attributes && typeof product.attributes === "object" && !Array.isArray(product.attributes)
    ? product.attributes as Record<string, unknown>
    : {};
  const eligibleTypes = ["sala de reuniões", "sala de conferências", "sala de formação", "coworking", "espaço para eventos"];
  const propertyType = String(attributes.propertyType ?? "").trim().toLocaleLowerCase();
  if ((attributes.spaceBookingEnabled !== true && attributes.spaceBookingEnabled !== "true") || !eligibleTypes.includes(propertyType)) return null;
  return { id: product.id, name: product.name };
}

export async function GET(request: Request) {
  try {
    const owner = await authenticatedOwner();
    if (!owner) return NextResponse.json({ message: "Inicie sessão com a conta proprietária.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    const productId = new URL(request.url).searchParams.get("productId");
    if (!productId || !z.string().uuid().safeParse(productId).success) {
      return NextResponse.json({ message: "Indique um anúncio válido.", code: "INVALID_PRODUCT_ID" }, { status: 400 });
    }
    const product = await ownedSpace(productId, owner.id);
    if (!product) return NextResponse.json({ message: "Espaço não encontrado nesta conta.", code: "SPACE_NOT_FOUND" }, { status: 404 });

    const [rules, exceptions] = await Promise.all([
      prisma.spaceAvailabilityRule.findMany({ where: { productId }, orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }),
      prisma.spaceAvailabilityException.findMany({ where: { productId }, orderBy: { startAt: "desc" }, take: 100 }),
    ]);
    return NextResponse.json({ product, rules, exceptions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[VENDOR_SPACE_AVAILABILITY_GET]", error);
    return NextResponse.json({ message: "Não foi possível carregar o calendário.", code: "SPACE_SCHEDULE_LOAD_FAILED" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const owner = await authenticatedOwner();
    if (!owner) return NextResponse.json({ message: "Inicie sessão com a conta proprietária.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    const parsed = scheduleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Verifique os horários enviados.", code: "INVALID_SPACE_SCHEDULE", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const input = parsed.data;
    if (input.rules.some((rule) => !validTimeZone(rule.timezone))) {
      return NextResponse.json({ message: "Um dos fusos horários não é válido.", code: "INVALID_TIMEZONE" }, { status: 400 });
    }
    if (new Set(input.rules.map((rule) => rule.timezone)).size !== 1) {
      return NextResponse.json({ message: "Todos os horários do mesmo espaço devem usar o mesmo fuso horário.", code: "MIXED_TIMEZONES" }, { status: 400 });
    }
    const product = await ownedSpace(input.productId, owner.id);
    if (!product) return NextResponse.json({ message: "Espaço não encontrado nesta conta.", code: "SPACE_NOT_FOUND" }, { status: 404 });

    const saved = await prisma.$transaction(async (tx) => {
      await tx.spaceAvailabilityRule.updateMany({ where: { productId: product.id, isActive: true }, data: { isActive: false } });
      await tx.spaceAvailabilityRule.createMany({
        data: input.rules.map((rule) => ({
          productId: product.id,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          timezone: rule.timezone,
          activeFrom: rule.activeFrom ? new Date(`${rule.activeFrom}T00:00:00.000Z`) : null,
          activeUntil: rule.activeUntil ? new Date(`${rule.activeUntil}T00:00:00.000Z`) : null,
          isActive: true,
        })),
      });
      return tx.spaceAvailabilityRule.findMany({
        where: { productId: product.id, isActive: true },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ product, rules: saved, message: "Horários atualizados. As regras anteriores foram preservadas como inativas." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[VENDOR_SPACE_AVAILABILITY_PUT]", error);
    return NextResponse.json({ message: "Não foi possível guardar os horários.", code: "SPACE_SCHEDULE_SAVE_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await authenticatedOwner();
    if (!owner) return NextResponse.json({ message: "Inicie sessão com a conta proprietária.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    const parsed = exceptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Verifique o bloqueio ou horário especial.", code: "INVALID_SPACE_EXCEPTION", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const input = parsed.data;
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    if (endAt <= startAt || startAt <= new Date() || endAt.getTime() - startAt.getTime() > 366 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ message: "O período especial deve ser futuro, válido e não superior a um ano.", code: "INVALID_EXCEPTION_INTERVAL" }, { status: 400 });
    }
    const product = await ownedSpace(input.productId, owner.id);
    if (!product) return NextResponse.json({ message: "Espaço não encontrado nesta conta.", code: "SPACE_NOT_FOUND" }, { status: 404 });

    const exception = await prisma.spaceAvailabilityException.create({
      data: { productId: product.id, type: input.type, startAt, endAt, reason: input.reason || null },
    });
    return NextResponse.json({ exception }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[VENDOR_SPACE_AVAILABILITY_POST]", error);
    return NextResponse.json({ message: "Não foi possível guardar a exceção.", code: "SPACE_EXCEPTION_SAVE_FAILED" }, { status: 500 });
  }
}
