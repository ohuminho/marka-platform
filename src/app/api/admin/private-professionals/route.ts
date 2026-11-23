import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

async function authorize() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return { error: NextResponse.json({ message: "Autenticação necessária." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, status: true, isFounder: true } });
  if (!user || user.status !== "ACTIVE" || !(user.isFounder || ["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(user.role))) {
    return { error: NextResponse.json({ message: "Apenas administradores autorizados podem verificar profissionais." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const profiles = await prisma.privateProfessionalProfile.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 250,
    select: {
      id: true, userId: true, publicName: true, specialties: true, region: true,
      status: true, verifiedAt: true, createdAt: true,
      user: { select: { name: true, email: true, phoneVerifiedAt: true } },
    },
  });
  return NextResponse.json({ profiles }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const schema = z.object({
    profileId: z.string().uuid(),
    status: z.enum(["VERIFIED", "SUSPENDED"]),
    reason: z.string().trim().max(1000).optional(),
  }).strict();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Decisão inválida.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  if (parsed.data.status === "SUSPENDED" && !parsed.data.reason) {
    return NextResponse.json({ message: "Indica o motivo da suspensão." }, { status: 422 });
  }

  const profile = await prisma.privateProfessionalProfile.findUnique({
    where: { id: parsed.data.profileId },
    select: { id: true, userId: true, status: true, publicName: true },
  });
  if (!profile) return NextResponse.json({ message: "Candidatura não encontrada." }, { status: 404 });
  const now = new Date();
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.privateProfessionalProfile.update({
        where: { id: profile.id },
        data: {
          status: parsed.data.status,
          verifiedAt: parsed.data.status === "VERIFIED" ? now : null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          actorType: "ADMIN",
          action: parsed.data.status === "VERIFIED" ? "PRIVATE_PROFESSIONAL_VERIFIED" : "PRIVATE_PROFESSIONAL_SUSPENDED",
          entityType: "PrivateProfessionalProfile",
          entityId: profile.id,
          ipAddress,
          userAgent,
          metadata: { userId: profile.userId, previousStatus: profile.status, status: parsed.data.status, reason: parsed.data.reason || null },
        },
      });
      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: "PRIVATE_PROFESSIONAL_REVIEW",
          title: parsed.data.status === "VERIFIED" ? "Perfil profissional verificado" : "Perfil profissional suspenso",
          message: parsed.data.status === "VERIFIED"
            ? "O teu perfil foi verificado. Já podes receber convites para pedidos privados compatíveis."
            : "O teu perfil profissional foi suspenso. Contacta a MARKA para obter esclarecimentos.",
          data: { profileId: profile.id, status: parsed.data.status },
        },
      });
    });
    return NextResponse.json({ success: true, profileId: profile.id, status: parsed.data.status });
  } catch (error) {
    console.error("[PRIVATE_PROFESSIONAL_REVIEW]", error);
    return NextResponse.json({ message: "Não foi possível guardar a decisão." }, { status: 500 });
  }
}
