import { prisma } from "@/database/client/prisma";

/**
 * Resolve the driver's MARKA operating organization.
 * A normal MARKA account already receives an active platform membership at signup.
 * Drivers must not be forced to create or join a separate company to apply.
 */
export async function resolveDriverOrganizationId(
  userId: string,
  requestedOrganizationId?: string | null,
): Promise<string | null> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      ...(requestedOrganizationId ? { organizationId: requestedOrganizationId } : {}),
      organization: { status: "ACTIVE" },
    },
    orderBy: { joinedAt: "asc" },
    select: { organizationId: true },
  });

  return membership?.organizationId ?? null;
}
