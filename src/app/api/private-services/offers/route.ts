import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function authenticatedUser() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });
  return user?.status === "ACTIVE" ? user : null;
}

export async function GET() {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const profile = await prisma.privateProfessionalProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "VERIFIED") {
      return NextResponse.json({ message: "Perfil profissional verificado necessário." }, { status: 403 });
    }

    const now = new Date();
    await prisma.privateServiceOffer.updateMany({
      where: { professionalId: profile.id, status: "PENDING", expiresAt: { lte: now } },
      data: { status: "EXPIRED", respondedAt: now },
    });
    const items = await prisma.privateServiceOffer.findMany({
      where: { professionalId: profile.id, status: { in: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "SELECTED", "WITHDRAWN"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, status: true, createdAt: true, expiresAt: true,
        request: {
          select: {
            id: true, reference: true, serviceType: true, specialty: true,
            region: true, status: true, createdAt: true,
          },
        },
      },
    });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[PRIVATE_SERVICE_OFFERS_LIST]", error);
    return NextResponse.json({ message: "Não foi possível carregar os convites." }, { status: 500 });
  }
}
