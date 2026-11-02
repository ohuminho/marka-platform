import { prisma } from "@/database/client/prisma";

type SellerIdentityInput = {
  id: string;
  ownerId: string;
  organizationId: string;
  businessType: string | null;
  status: string;
};

export async function getPublicSellerVerification(
  sellers: SellerIdentityInput[],
): Promise<Map<string, boolean>> {
  const result = new Map(sellers.map((seller) => [seller.id, false]));
  const activeSellers = sellers.filter((seller) => seller.status === "ACTIVE");
  if (!activeSellers.length) return result;

  const ownerIds = [...new Set(activeSellers.map((seller) => seller.ownerId))];
  const organizationIds = [...new Set(activeSellers.map((seller) => seller.organizationId))];
  const now = new Date();

  const [users, profiles] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ownerIds }, status: "ACTIVE" },
      select: { id: true },
    }),
    prisma.complianceProfile.findMany({
      where: {
        status: "VERIFIED",
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
        OR: [
          { subjectType: "KYC", subjectId: { in: ownerIds }, organizationId: null },
          { subjectType: "KYB", subjectId: { in: organizationIds }, organizationId: { in: organizationIds } },
        ],
      },
      include: { documents: { select: { status: true, expiresAt: true } } },
    }),
  ]);

  const activeOwnerIds = new Set(users.map((user) => user.id));
  const validProfiles = profiles.filter((profile) =>
    profile.documents.length > 0 &&
    profile.documents.every((document) =>
      document.status === "VERIFIED" &&
      (!document.expiresAt || document.expiresAt > now)
    )
  );

  for (const seller of activeSellers) {
    if (!activeOwnerIds.has(seller.ownerId)) continue;
    if (seller.businessType !== "COMPANY" && seller.businessType !== "INDIVIDUAL") continue;\n    const isCompany = seller.businessType === "COMPANY";
    const valid = validProfiles.some((profile) =>
      isCompany
        ? profile.subjectType === "KYB" &&
          profile.subjectId === seller.organizationId &&
          profile.organizationId === seller.organizationId
        : profile.subjectType === "KYC" &&
          profile.subjectId === seller.ownerId &&
          profile.organizationId === null
    );
    result.set(seller.id, valid);
  }

  return result;
}
