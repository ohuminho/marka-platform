import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const experienceSchema = z.object({
  role: z.string().trim().max(120).default(""),
  company: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  startDate: z.string().trim().max(20).default(""),
  endDate: z.string().trim().max(20).default(""),
  description: z.string().trim().max(2000).default(""),
});

const educationSchema = z.object({
  qualification: z.string().trim().max(160).default(""),
  institution: z.string().trim().max(160).default(""),
  location: z.string().trim().max(120).default(""),
  startDate: z.string().trim().max(20).default(""),
  endDate: z.string().trim().max(20).default(""),
  details: z.string().trim().max(1000).default(""),
});

const cvContentSchema = z.object({
  templateId: z.enum(["ats", "classic", "executive", "creative"]).default("ats"),
  fullName: z.string().trim().max(160).default(""),
  professionalTitle: z.string().trim().max(160).default(""),
  email: z.string().trim().max(254).default(""),
  phone: z.string().trim().max(40).default(""),
  location: z.string().trim().max(160).default(""),
  summary: z.string().trim().max(2500).default(""),
  experience: z.array(experienceSchema).max(12).default([]),
  education: z.array(educationSchema).max(12).default([]),
  skills: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  languages: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  certifications: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  projects: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  references: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
  linkedin: z.string().trim().max(254).default(""),
  portfolio: z.string().trim().max(254).default(""),
});

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(100).default("O meu currículo"),
  content: cvContentSchema,
});

async function authenticatedUser() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  if (!token) return null;

  const session = await new SessionService().validate(token);
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
    if (!user) {
      return NextResponse.json({ message: "Inicie sessão para aceder aos seus currículos." }, { status: 401 });
    }

    const documents = await prisma.markaCvDocument.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ documents }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_CV_GET]", error);
    return NextResponse.json({ message: "Não foi possível carregar os currículos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) {
      return NextResponse.json({ message: "Inicie sessão para guardar o seu currículo." }, { status: 401 });
    }

    const parsed = saveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Verifique os dados do currículo.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const count = await prisma.markaCvDocument.count({ where: { userId: user.id } });
    if (count >= 20) {
      return NextResponse.json({ message: "Atingiu o limite de 20 currículos. Apague uma versão para criar outra.", code: "CV_LIMIT_REACHED" }, { status: 409 });
    }

    const document = await prisma.markaCvDocument.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        content: parsed.data.content as Prisma.InputJsonValue,
      },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ document, message: "Currículo guardado." }, { status: 201 });
  } catch (error) {
    console.error("[MARKA_CV_POST]", error);
    return NextResponse.json({ message: "Não foi possível guardar o currículo." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) {
      return NextResponse.json({ message: "Inicie sessão para atualizar o currículo." }, { status: 401 });
    }

    const parsed = saveSchema.extend({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Verifique os dados do currículo.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const existing = await prisma.markaCvDocument.findFirst({
      where: { id: parsed.data.id, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Currículo não encontrado." }, { status: 404 });
    }

    const document = await prisma.markaCvDocument.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content as Prisma.InputJsonValue,
      },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ document, message: "Alterações guardadas." });
  } catch (error) {
    console.error("[MARKA_CV_PUT]", error);
    return NextResponse.json({ message: "Não foi possível atualizar o currículo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) {
      return NextResponse.json({ message: "Inicie sessão para apagar o currículo." }, { status: 401 });
    }

    const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Identificador de currículo inválido." }, { status: 400 });
    }

    const result = await prisma.markaCvDocument.deleteMany({
      where: { id: parsed.data.id, userId: user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ message: "Currículo não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ message: "Currículo apagado." });
  } catch (error) {
    console.error("[MARKA_CV_DELETE]", error);
    return NextResponse.json({ message: "Não foi possível apagar o currículo." }, { status: 500 });
  }
}
