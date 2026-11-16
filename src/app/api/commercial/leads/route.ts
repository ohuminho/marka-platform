import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => typeof value === "string" && !value.trim() ? undefined : value,
    z.string().trim().max(maximum).optional(),
  );

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  organizationName: optionalText(160),
  email: z.preprocess(
    (value) => typeof value === "string" && !value.trim() ? undefined : value,
    z.string().trim().email().max(254).optional(),
  ),
  phone: optionalText(32),
  leadType: z.enum([
    "ADVERTISER",
    "MERCHANT",
    "LOGISTICS",
    "SUPPLIER",
    "SERVICE_PROVIDER",
    "STRATEGIC_PARTNER",
    "OTHER",
  ]).default("OTHER"),
  message: optionalText(4000),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
}).strict().superRefine((value, context) => {
  if (!value.email && !value.phone) {
    context.addIssue({
      code: "custom",
      path: ["email"],
      message: "Indique um e-mail ou telefone para contacto.",
    });
  }
  if (value.phone) {
    const digits = value.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Indique um telefone válido, incluindo o indicativo do país.",
      });
    }
  }
});

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getClientIp(request: Request): string | null {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || null;
}

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      accepted: false,
      message: "Limite temporário de pedidos atingido. Tente novamente mais tarde.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 8192) {
      return NextResponse.json(
        { accepted: false, message: "O pedido excede o tamanho permitido." },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { accepted: false, message: "Pedido inválido." },
        { status: 400 },
      );
    }

    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          accepted: false,
          message: "Verifique os dados e o consentimento antes de enviar.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Honeypot: return the same public response without persisting bot submissions.
    if (parsed.data.website?.trim()) {
      return NextResponse.json(
        { accepted: true },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }

    const email = parsed.data.email?.toLowerCase() ?? null;
    const phone = parsed.data.phone?.replace(/[^\d+]/g, "") ?? null;
    if (!email && !phone) {
      return NextResponse.json(
        { accepted: false, message: "E-mail ou telefone obrigatório." },
        { status: 400 },
      );
    }

    const contactFingerprint = sha256((email ?? "") + "|" + (phone ?? ""));
    const ip = getClientIp(request);
    const ipIdentity = ip ? "ip:" + sha256(ip) : "contact:" + contactFingerprint;

    const ipQuota = await reserveApiRequest({
      scope: "COMMERCIAL_LEAD_IP",
      anonymousIdentity: ipIdentity,
      windows: [
        { limit: 5, windowMs: 60_000 },
        { limit: 15, windowMs: 24 * 60 * 60 * 1000 },
      ],
    });
    if (!ipQuota.allowed) return rateLimitResponse(ipQuota.retryAfterSeconds);

    const contactQuota = await reserveApiRequest({
      scope: "COMMERCIAL_LEAD_CONTACT",
      anonymousIdentity: "contact:" + contactFingerprint,
      windows: [{ limit: 1, windowMs: 24 * 60 * 60 * 1000 }],
    });
    if (!contactQuota.allowed) return rateLimitResponse(contactQuota.retryAfterSeconds);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await prisma.commercialLead.findFirst({
      where: {
        createdAt: { gte: since },
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true },
    });

    if (!duplicate) {
      await prisma.commercialLead.create({
        data: {
          name: parsed.data.name,
          organizationName: parsed.data.organizationName ?? null,
          email,
          phone,
          leadType: parsed.data.leadType,
          message: parsed.data.message ?? null,
          source: "MARKA_ADVERTISING_PAGE",
          consentAt: new Date(),
          ipFingerprint: ip ? sha256(ip) : null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        },
      });
    }

    return NextResponse.json(
      { accepted: true },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[COMMERCIAL_LEAD_CAPTURE]",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { accepted: false, message: "Não foi possível registar o pedido neste momento." },
      { status: 503 },
    );
  }
}
