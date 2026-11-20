import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(24).refine(
    (value) => value === "" || /^\+?[0-9\s().-]{7,24}$/.test(value),
    "Introduza um número de telefone válido, incluindo o indicativo do país.",
  ),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  locale: z.string().trim().min(2).max(20),
  timezone: z.string().trim().min(3).max(64),
}).strict();

export async function PATCH(request: Request) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    if (!token) {
      return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    }

    const session = await new SessionService().validate(token);
    if (!session) {
      return NextResponse.json({ code: "INVALID_SESSION" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        code: "PROFILE_VALIDATION_FAILED",
        message: parsed.error.issues[0]?.message ?? "Verifique os dados introduzidos.",
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true, profile: { select: { phone: true } } },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ code: "ACCOUNT_NOT_ACTIVE" }, { status: 403 });
    }

    const phone = parsed.data.phone || null;
    const phoneChanged = (user.profile?.phone ?? null) !== phone;
    const profile = await prisma.$transaction(async (tx) => {
      const updated = await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          displayName: parsed.data.displayName,
          phone,
          countryCode: parsed.data.countryCode,
          locale: parsed.data.locale,
          timezone: parsed.data.timezone,
        },
        update: {
          displayName: parsed.data.displayName,
          phone,
          countryCode: parsed.data.countryCode,
          locale: parsed.data.locale,
          timezone: parsed.data.timezone,
        },
        select: {
          displayName: true,
          phone: true,
          avatarUrl: true,
          countryCode: true,
          locale: true,
          timezone: true,
        },
      });
      if (phoneChanged) {
        await tx.user.update({
          where: { id: user.id },
          data: { phoneVerifiedAt: null },
        });
      }
      return updated;
    });

    return NextResponse.json({
      profile,
      phoneVerificationRequired: phoneChanged && Boolean(phone),
    }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[PROFILE_UPDATE_ERROR]", error);
    return NextResponse.json({
      code: "PROFILE_UPDATE_FAILED",
      message: "Não foi possível guardar os dados da conta. Tente novamente.",
    }, { status: 500 });
  }
}
