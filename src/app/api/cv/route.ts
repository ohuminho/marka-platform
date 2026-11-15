import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const runtime = "nodejs";

const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_PAYLOAD_BYTES = 48 * 1024;
const STRING_FIELDS = [
  "fullName", "professionalTitle", "email", "phone", "location",
  "summary", "linkedin", "portfolio",
] as const;
const ARRAY_FIELDS = [
  "skills", "languages", "certifications", "projects", "references",
] as const;
const EXPERIENCE_FIELDS = [
  "role", "company", "location", "startDate", "endDate", "description",
] as const;
const EDUCATION_FIELDS = [
  "qualification", "institution", "location", "startDate", "endDate", "details",
] as const;
const TEMPLATE_IDS = new Set(["ats", "classic", "executive", "creative"]);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEntry(
  value: unknown,
  fields: readonly string[],
): JsonRecord | null {
  if (!isRecord(value)) return null;
  const entry: JsonRecord = {};
  for (const field of fields) {
    const item = value[field];
    if (typeof item !== "string" || item.length > 4000) return null;
    entry[field] = item;
  }
  return entry;
}

function normalizeCv(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  if (typeof value.templateId !== "string" || !TEMPLATE_IDS.has(value.templateId)) return null;

  const normalized: JsonRecord = { templateId: value.templateId };
  for (const field of STRING_FIELDS) {
    const item = value[field];
    if (typeof item !== "string" || item.length > 4000) return null;
    normalized[field] = item;
  }

  for (const field of ARRAY_FIELDS) {
    const items = value[field];
    if (!Array.isArray(items) || items.length > 40 ||
      !items.every((item) => typeof item === "string" && item.length <= 500)) return null;
    normalized[field] = items;
  }

  const experience = value.experience;
  if (!Array.isArray(experience) || experience.length > 20) return null;
  const normalizedExperience = experience.map((item) => normalizeEntry(item, EXPERIENCE_FIELDS));
  if (normalizedExperience.some((item) => item === null)) return null;
  normalized.experience = normalizedExperience;

  const education = value.education;
  if (!Array.isArray(education) || education.length > 20) return null;
  const normalizedEducation = education.map((item) => normalizeEntry(item, EDUCATION_FIELDS));
  if (normalizedEducation.some((item) => item === null)) return null;
  normalized.education = normalizedEducation;

  return normalized;
}

async function authenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AuthConfig.cookies.name)?.value;
  if (!token) return null;

  const session = await new SessionService().validate(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user.id;
}

export async function GET() {
  try {
    const userId = await authenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
    }

    const now = new Date();
    // Expired drafts are inaccessible immediately and physically purged on access too.
    await prisma.markaCvDraft.deleteMany({ where: { expiresAt: { lte: now } } });

    const draft = await prisma.markaCvDraft.findUnique({
      where: { userId },
      select: { content: true, expiresAt: true },
    });

    return NextResponse.json({
      draft: draft ? { content: draft.content, expiresAt: draft.expiresAt.toISOString() } : null,
    });
  } catch (error) {
    console.error("[MARKA_CV_DRAFT_READ_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível carregar o currículo temporário." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ message: "O currículo excede o limite permitido." }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ message: "Pedido inválido." }, { status: 400 });
    }

    const content = isRecord(body) ? normalizeCv(body.cv) : null;
    if (!content) {
      return NextResponse.json({ message: "Os dados do currículo são inválidos." }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RETENTION_MS);
    await prisma.markaCvDraft.upsert({
      where: { userId },
      create: { userId, content, expiresAt },
      update: { content, expiresAt },
    });

    return NextResponse.json({ saved: true, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("[MARKA_CV_DRAFT_SAVE_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível guardar o currículo temporário." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await authenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Autenticação necessária." }, { status: 401 });
    }

    await prisma.markaCvDraft.deleteMany({ where: { userId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[MARKA_CV_DRAFT_DELETE_ERROR]", error);
    return NextResponse.json({ message: "Não foi possível eliminar o currículo." }, { status: 500 });
  }
}
