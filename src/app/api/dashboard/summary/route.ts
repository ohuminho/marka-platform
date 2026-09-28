import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { prisma } from "@/database/client/prisma";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const sessionService = new SessionService();
    const session = await sessionService.validate(token);

    if (!session) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true },
    });

    if (
      !user ||
      user.status === "SUSPENDED" ||
      user.status === "LOCKED" ||
      user.status === "DELETED" ||
      user.status === "PENDING_VERIFICATION"
    ) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const organizationId =
      request.nextUrl.searchParams.get("organizationId") ?? undefined;

    const [activeUsers, completedTransactions, completedPayments, activeStores] =
      await Promise.all([
        prisma.user.count({
          where: { status: "ACTIVE" },
        }),
        prisma.transaction.count({
          where: { status: "COMPLETED" },
        }),
        prisma.payment.aggregate({
          where: {
            status: "COMPLETED",
            currency: "AOA",
          },
          _sum: { amountMinor: true },
        }),
        prisma.store.count({
          where: { status: "ACTIVE" },
        }),
      ]);

    const revenueMinor = completedPayments._sum.amountMinor ?? BigInt(0);

    return Response.json({
      scope: organizationId ? "organization" : "platform",
      organizationId: organizationId ?? null,
      metrics: {
        activeUsers,
        completedTransactions,
        revenueMinor: revenueMinor.toString(),
        revenueCurrency: "AOA",
        activeMarkets: activeStores,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_SUMMARY_ERROR]", error);

    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load dashboard metrics.",
      },
      { status: 500 }
    );
  }
}
