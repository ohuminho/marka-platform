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

  const organizations = await prisma.organizationMembership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { organizationId: true },
  });
  const profiles = (
    await Promise.all(
      organizations.map(({ organizationId }) =>
        new ComplianceService().listForOrganization(organizationId),
      ),
    )
  ).flat();

  return NextResponse.json({ profiles });
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
