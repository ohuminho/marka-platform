import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { ComplianceService } from "@/services/compliance/compliance.service";

const submitSchema = z.object({
  subjectType: z.enum(["KYC", "KYD", "KYB"]),
  organizationId: z.string().uuid().nullable().optional(),
  countryCode: z.string().trim().min(2).max(3).nullable().optional(),
  documents: z.array(
    z.object({
      documentType: z.string().trim().min(2).max(100),
      documentRef: z.string().trim().max(500).optional(),
      expiresAt: z.string().datetime().optional(),
    }),
  ).max(20).default([]),
});

async function authenticate() {
  const token = (await cookies()).get("marka_session")?.value;
  if (!token) return null;
  const session = await new SessionService().validate(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export async function GET() {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }
    const profiles = await new ComplianceService().getForSubject(user.id);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("[COMPLIANCE_GET_ERROR]", error);
    return NextResponse.json({ message: "Unable to load compliance status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const input = submitSchema.parse(await request.json());

    if (input.organizationId) {
      const membership = await prisma.organizationMembership.findFirst({
        where: {
          userId: user.id,
          organizationId: input.organizationId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json({ message: "Organization context is not available." }, { status: 403 });
      }
    }

    const profiles = await new ComplianceService().submit(
      user.id,
      input.subjectType,
      input.organizationId ?? null,
      input.countryCode ?? null,
      input.documents,
    );

    return NextResponse.json({ profiles }, { status: 201 });
  } catch (error) {
    console.error("[COMPLIANCE_POST_ERROR]", error);
    return NextResponse.json({ message: "Unable to submit compliance information." }, { status: 400 });
  }
}
