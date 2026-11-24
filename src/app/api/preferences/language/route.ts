import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const languageSchema = z.enum(["pt", "en", "fr", "zh", "ar", "os"]);

async function getActiveUserId() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) return null;
  const session = await new SessionService().validate(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });
  return user?.status === "ACTIVE" ? user.id : null;
}

export async function GET() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ language: null, authenticated: false }, { headers: NO_STORE });
    }
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { locale: true },
    });
    const parsed = languageSchema.safeParse(profile?.locale);
    return NextResponse.json(
      { language: parsed.success ? parsed.data : null, authenticated: true },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[LANGUAGE_PREFERENCE_READ_ERROR]", error);
    return NextResponse.json({ code: "LANGUAGE_PREFERENCE_READ_FAILED" }, { status: 500, headers: NO_STORE });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401, headers: NO_STORE });
    }
    const body = await request.json().catch(() => null);
    const parsed = z.object({ language: languageSchema }).strict().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: "UNSUPPORTED_LANGUAGE" }, { status: 400, headers: NO_STORE });
    }
    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { userId, locale: parsed.data.language },
      update: { locale: parsed.data.language },
      select: { locale: true },
    });
    return NextResponse.json({ language: profile.locale }, { headers: NO_STORE });
  } catch (error) {
    console.error("[LANGUAGE_PREFERENCE_SAVE_ERROR]", error);
    return NextResponse.json({ code: "LANGUAGE_PREFERENCE_SAVE_FAILED" }, { status: 500, headers: NO_STORE });
  }
}
