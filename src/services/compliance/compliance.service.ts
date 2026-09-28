import { prisma } from "@/database/client/prisma";
import type { ComplianceSubjectType } from "@prisma/client";
import type { ComplianceProfileView } from "./compliance.types";

function toView(profile: Awaited<ReturnType<typeof prisma.complianceProfile.findUnique>> & {
  documents?: Array<any>;
  cases?: Array<any>;
}): ComplianceProfileView | null {
  if (!profile) return null;
  return {
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
    documents: (profile.documents ?? []).map((d) => ({
      id: d.id,
      documentType: d.documentType,
      status: d.status,
      expiresAt: d.expiresAt?.toISOString() ?? null,
      rejectionReason: d.rejectionReason,
    })),
    cases: (profile.cases ?? []).map((c) => ({
      id: c.id,
      status: c.status,
      reason: c.reason,
      decision: c.decision ?? null,
      notes: c.notes ?? null,
    })),
  };
}

export class ComplianceService {
  async getForSubject(
    subjectId: string,
    organizationId?: string | null,
    subjectType?: ComplianceSubjectType,
  ): Promise<ComplianceProfileView[]> {
    const profiles = await prisma.complianceProfile.findMany({
      where: {
        subjectId,
        ...(organizationId
          ? { organizationId }
          : {}),
        ...(subjectType
          ? { subjectType }
          : {}),
      },
      include: {
        documents: true,
        cases: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return profiles.map((profile) => toView(profile)!).filter(Boolean);
  }

  async submit(
    subjectId: string,
    subjectType: ComplianceSubjectType,
    organizationId: string | null,
    countryCode: string | null,
    documents: Array<{
      documentType: string;
      documentRef?: string;
      expiresAt?: string;
    }>,
  ) {
    const existing = await prisma.complianceProfile.findFirst({
      where: {
        subjectType,
        subjectId,
        organizationId,
      },
      select: { id: true },
    });

    const profile = existing
      ? await prisma.complianceProfile.update({
          where: { id: existing.id },
          data: {
            countryCode,
            status: "PENDING",
            submittedAt: new Date(),
            rejectionReason: null,
          },
        })
      : await prisma.complianceProfile.create({
          data: {
            subjectType,
            subjectId,
            organizationId,
            countryCode,
            status: "PENDING",
            submittedAt: new Date(),
          },
        });

    if (documents.length) {
      await prisma.complianceDocument.createMany({
        data: documents.map((document) => ({
          profileId: profile.id,
          documentType: document.documentType,
          documentRef: document.documentRef,
          expiresAt: document.expiresAt
            ? new Date(document.expiresAt)
            : undefined,
        })),
      });
    }

    return this.getForSubject(subjectId, organizationId);
  }

  async listForOrganization(organizationId: string) {
    const profiles = await prisma.complianceProfile.findMany({
      where: { organizationId },
      include: { documents: true, cases: true },
      orderBy: { updatedAt: "desc" },
    });
    return profiles.map((profile) => toView(profile)!).filter(Boolean);
  }

  async review(
    id: string,
    status: "VERIFIED" | "REJECTED" | "IN_REVIEW" | "SUSPENDED",
    reviewerId: string,
    reason?: string,
  ) {
    const profile = await prisma.complianceProfile.update({
      where: { id },
      data: {
        status,
        rejectionReason:
          status === "REJECTED" ? reason ?? "Compliance review rejected." : null,
        verifiedAt:
          status === "VERIFIED" ? new Date() : null,
      },
      include: { documents: true, cases: true },
    });

    await prisma.complianceCase.create({
      data: {
        profileId: id,
        status: status === "REJECTED" ? "RESOLVED" : "CLOSED",
        reason: reason ?? `Compliance status changed to ${status}.`,
        assignedTo: reviewerId,
        decision: status,
        resolvedAt: new Date(),
      },
    });

    return toView(profile);
  }
}
