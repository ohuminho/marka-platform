import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { ComplianceService } from "@/services/compliance/compliance.service";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["VERIFIED", "REJECTED", "IN_REVIEW", "SUSPENDED"]),
  reason: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, role: true },
  });
  if (!user || user.status !== "ACTIVE" || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ message: "Administrative access required." }, { status: 403 });
  }

  // Compliance reviewers need a complete queue, including personal KYC/KYD
  // profiles that have no organization membership. This endpoint is restricted
  // to authenticated platform administrators above.
  const profiles = await prisma.complianceProfile.findMany({
    include: { documents: true, cases: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({
    profiles: profiles.map((profile) => ({
      id: profile.id,
      subjectType: profile.subjectType,
      subjectId: profile.subjectId,
      organizationId: profile.organizationId,
      status: profile.status,
      countryCode: profile.countryCode,
      submittedAt: profile.submittedAt?.toISOString() ?? null,
      verifiedAt: profile.verifiedAt?.toISOString() ?? null,
      expiresAt: profile.expiresAt?.toISOString() ?? null,
      rejectionReason: profile.rejectionReason,
      documents: profile.documents.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        status: document.status,
        expiresAt: document.expiresAt?.toISOString() ?? null,
        rejectionReason: document.rejectionReason,
      })),
      cases: profile.cases.map((item) => ({
        id: item.id,
        status: item.status,
        reason: item.reason,
        decision: item.decision,
        notes: item.notes,
      })),
    })),
  });
}

export async function PATCH(request: Request) {
  const token = (await cookies()).get("marka_session")?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, role: true },
  });
  if (!user || user.status !== "ACTIVE" || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ message: "Administrative access required." }, { status: 403 });
  }

  try {
    const input = schema.parse(await request.json());
    const profile = await prisma.complianceProfile.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ message: "Compliance profile not found." }, { status: 404 });

    // A reviewer must never approve or reject their own personal identity profile.
    // Founder ownership and administrator permissions do not override this control.
    const target = await prisma.complianceProfile.findUnique({
      where: { id: input.id },
      select: { subjectType: true, subjectId: true, organizationId: true },
    });
    if (target?.subjectType === "KYC" && target.organizationId === null && target.subjectId === user.id) {
      return NextResponse.json(
        { message: "Independent review is required for your own identity profile." },
        { status: 403 },
      );
    }

    const result = await new ComplianceService().review(
      input.id,
      input.status,
      user.id,
      input.reason,
    );

    return NextResponse.json({ profile: result });
  } catch (error) {
    console.error("[COMPLIANCE_REVIEW_ERROR]", error);
    return NextResponse.json({ message: "Unable to review compliance profile." }, { status: 400 });
  }
}
