import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

const schema = z.object({
  publicName: z.string().trim().min(2).max(120),
  specialties: z.array(z.string().trim().min(2).max(100)).min(1).max(8),
  region: z.string().trim().max(100).optional().or(z.literal("")),
}).strict();

async function currentUser() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, status: "ACTIVE" },
    select: { id: true, name: true, email: true },
  });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
  const profile = await prisma.privateProfessionalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, publicName: true, specialties: true, region: true, status: true, verifiedAt: true, createdAt: true },
  });
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Dados profissionais inválidos.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const specialties = [...new Set(parsed.data.specialties.map((item) => item.trim()).filter(Boolean))];
  if (!specialties.length) return NextResponse.json({ message: "Indica pelo menos uma especialidade." }, { status: 400 });

  try {
    const existing = await prisma.privateProfessionalProfile.findUnique({ where: { userId: user.id } });
    if (existing && existing.status !== "PENDING") {
      return NextResponse.json({ message: "Um perfil já verificado ou suspenso não pode ser alterado por esta via. Contacta a equipa de conformidade." }, { status: 409 });
    }
    const profile = await prisma.privateProfessionalProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, publicName: parsed.data.publicName, specialties, region: parsed.data.region || null },
      update: { publicName: parsed.data.publicName, specialties, region: parsed.data.region || null },
      select: { id: true, publicName: true, specialties: true, region: true, status: true, createdAt: true },
    });
    return NextResponse.json({ profile, message: "Candidatura submetida. O perfil só receberá pedidos depois da verificação da MARKA." }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("[PRIVATE_PROFESSIONAL_APPLY]", error);
    return NextResponse.json({ message: "Não foi possível submeter a candidatura profissional." }, { status: 500 });
  }
}
