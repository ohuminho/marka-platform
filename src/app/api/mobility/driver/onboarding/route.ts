import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  licenseNumber: z.string().trim().min(3).max(80).optional(),
  countryCode: z.string().trim().length(2).default("AO"),
});

const REQUIRED_DRIVER_DOCUMENTS = [
  {
    documentType: "IDENTITY_DOCUMENT",
    label: "BI, passaporte ou autorização de residência válida",
  },
  {
    documentType: "DRIVING_LICENSE",
    label: "Carta de condução válida e adequada ao veículo",
  },
  {
    documentType: "CRIMINAL_RECORD",
    label: "Registo criminal, sujeito às regras oficiais aplicáveis",
  },
] as const;

export async function GET(request: Request) {
  const token = (await import("next/headers")).cookies;
  const cookieStore = await token();
  const sessionToken = cookieStore.get(AuthConfig.cookies.name)?.value;
  if (!sessionToken) {
    return NextResponse.json({ message: "Autenticação necessária.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  }

  const session = await new SessionService().validate(sessionToken);
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida ou expirada.", code: "INVALID_SESSION" }, { status: 401 });
  }

  const organizationId = request.headers.get("X-Organization-Id")?.trim();
  if (!organizationId) {
    return NextResponse.json({ message: "X-Organization-Id é obrigatório.", code: "ORGANIZATION_ID_REQUIRED" }, { status: 400 });
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: session.userId, organizationId, status: "ACTIVE", organization: { status: "ACTIVE" } },
    select: { organizationId: true },
  });
  if (!membership) {
    return NextResponse.json({ message: "Acesso à organização negado.", code: "ORGANIZATION_ACCESS_DENIED" }, { status: 403 });
  }

  const driver = await prisma.mobilityDriver.findFirst({
    where: { userId: session.userId, organizationId },
    include: { verifications: { orderBy: { createdAt: "desc" } }, vehicles: { include: { vehicle: { include: { verifications: true } } } } },
  });

  return NextResponse.json({
    driver,
    requiredDriverDocuments: REQUIRED_DRIVER_DOCUMENTS,
    requiredVehicleDocuments: [
      "LIVRETE OU TÍTULO DE PROPRIEDADE",
      "AUTORIZAÇÃO/DECLARAÇÃO DE USO SE O VEÍCULO PERTENCER A TERCEIRO",
      "SEGURO AUTOMÓVEL OBRIGATÓRIO E COBERTURA APLICÁVEL AO SERVIÇO",
      "INSPEÇÃO TÉCNICA E LICENÇA DO VEÍCULO, CONFORME A CATEGORIA",
    ],
    activationPolicy: "O perfil permanece pendente até a verificação dos requisitos, documentos e veículo. O registo não autoriza automaticamente o início de viagens.",
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(AuthConfig.cookies.name)?.value;
  if (!token) {
    return NextResponse.json({ message: "Autenticação necessária.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  }

  const session = await new SessionService().validate(token);
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida ou expirada.", code: "INVALID_SESSION" }, { status: 401 });
  }

  const organizationId = request.headers.get("X-Organization-Id")?.trim();
  if (!organizationId) {
    return NextResponse.json({ message: "X-Organization-Id é obrigatório.", code: "ORGANIZATION_ID_REQUIRED" }, { status: 400 });
  }

  let input: z.infer<typeof onboardingSchema>;
  try {
    input = onboardingSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Dados de candidatura inválidos.", code: "INVALID_ONBOARDING_DATA" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, status: true, emailVerifiedAt: true, phoneVerifiedAt: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "A conta MARKA deve estar ativa.", code: "USER_NOT_ACTIVE" }, { status: 403 });
    }

    const membership = await prisma.organizationMembership.findFirst({
      where: { userId: user.id, organizationId, status: "ACTIVE", organization: { status: "ACTIVE" } },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ message: "Acesso à organização negado.", code: "ORGANIZATION_ACCESS_DENIED" }, { status: 403 });
    }

    const existing = await prisma.mobilityDriver.findFirst({
      where: { userId: user.id, organizationId },
      select: { id: true, status: true, displayName: true },
    });
    if (existing) {
      return NextResponse.json({ driver: existing, alreadyApplied: true }, { status: 200 });
    }

    const driver = await prisma.$transaction(async (tx) => {
      const created = await tx.mobilityDriver.create({
        data: {
          organizationId,
          userId: user.id,
          displayName: input.displayName?.trim() || user.name,
          licenseNumber: input.licenseNumber?.trim() || undefined,
          countryCode: input.countryCode.toUpperCase(),
          status: "PENDING",
          metadata: {
            onboardingVersion: 1,
            country: "AO",
            submittedAt: new Date().toISOString(),
            accountIdentityReused: true,
            emailVerifiedAtSignup: user.emailVerifiedAt?.toISOString() ?? null,
            phoneVerifiedAtSignup: user.phoneVerifiedAt?.toISOString() ?? null,
          },
        },
        select: { id: true, status: true, displayName: true, createdAt: true },
      });

      await tx.mobilityDriverVerification.createMany({
        data: REQUIRED_DRIVER_DOCUMENTS.map((document) => ({
          driverId: created.id,
          documentType: document.documentType,
          status: "PENDING" as const,
          metadata: {
            requirementLabel: document.label,
            source: "ANGOLA_DRIVER_ONBOARDING_CHECKLIST",
            documentSubmitted: false,
          },
        })),
      });

      return created;
    });

    return NextResponse.json({
      driver,
      requiredDriverDocuments: REQUIRED_DRIVER_DOCUMENTS,
      nextStep: "Submeter os documentos exigidos e registar o veículo. O perfil não pode ficar online até a verificação e ativação.",
    }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("[MARKA_DRIVER_ONBOARDING_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível iniciar a candidatura de motorista.", code: "DRIVER_ONBOARDING_FAILED" }, { status: 500 });
  }
}
