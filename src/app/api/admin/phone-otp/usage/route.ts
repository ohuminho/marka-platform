import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { PhoneOtpPolicy } from "@/core/auth/phone/phone-otp.policy";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

function decimalToNumber(value: { toNumber(): number } | null | undefined) {
  return value ? value.toNumber() : 0;
}

export async function GET() {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;

    if (!session) {
      return NextResponse.json(
        { message: "Autenticação necessária." },
        { status: 401 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, status: true, isFounder: true },
    });

    if (
      !admin ||
      admin.status !== "ACTIVE" ||
      !(admin.isFounder || ["ADMIN", "SUPER_ADMIN"].includes(admin.role))
    ) {
      return NextResponse.json(
        { message: "Apenas administradores autorizados podem consultar os custos SMS." },
        { status: 403 }
      );
    }

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const period = { requestedAt: { gte: periodStart, lt: periodEnd } };

    const [aggregate, statusGroups, countryGroups, missingCostCount, totalCount] =
      await Promise.all([
        prisma.smsDeliveryLedger.aggregate({
          where: period,
          _sum: { unitCost: true },
        }),
        prisma.smsDeliveryLedger.groupBy({
          by: ["status"],
          where: period,
          _count: { _all: true },
          _sum: { unitCost: true },
        }),
        prisma.smsDeliveryLedger.groupBy({
          by: ["countryCode"],
          where: period,
          _count: { _all: true },
          _sum: { unitCost: true },
        }),
        prisma.smsDeliveryLedger.count({
          where: {
            ...period,
            status: { in: ["REQUESTED", "ACCEPTED", "DELIVERED", "UNKNOWN"] },
            unitCost: null,
          },
        }),
        prisma.smsDeliveryLedger.count({ where: period }),
      ]);

    const spendAoa = decimalToNumber(aggregate._sum.unitCost);
    const budgetAoa = PhoneOtpPolicy.monthlyBudgetAoa;
    const budgetUsagePercent = budgetAoa > 0 ? (spendAoa / budgetAoa) * 100 : 0;
    const alertsReached = PhoneOtpPolicy.budgetAlertPercentages.filter(
      (threshold) => budgetUsagePercent >= threshold
    );
    const counts = Object.fromEntries(
      statusGroups.map((item) => [item.status, item._count._all])
    );

    const acceptedCount = (counts.ACCEPTED ?? 0) + (counts.DELIVERED ?? 0);
    const deliveredCount = counts.DELIVERED ?? 0;

    return NextResponse.json(
      {
        period: {
          startsAt: periodStart.toISOString(),
          endsAt: periodEnd.toISOString(),
          currency: "AOA",
        },
        budget: {
          monthlyLimitAoa: budgetAoa,
          spendAoa,
          remainingAoa: Math.max(0, budgetAoa - spendAoa),
          usagePercent: Number(budgetUsagePercent.toFixed(2)),
          alertsReached,
          circuitBreakerOpen: spendAoa >= budgetAoa,
          costCoverageComplete: missingCostCount === 0,
          recordsMissingCost: missingCostCount,
        },
        delivery: {
          total: totalCount,
          requested: counts.REQUESTED ?? 0,
          acceptedByProvider: acceptedCount,
          delivered: deliveredCount,
          rejected: counts.REJECTED ?? 0,
          failed: counts.FAILED ?? 0,
          unknown: counts.UNKNOWN ?? 0,
          deliveryRatePercent:
            acceptedCount > 0
              ? Number(((deliveredCount / acceptedCount) * 100).toFixed(2))
              : null,
          byStatus: statusGroups.map((item) => ({
            status: item.status,
            count: item._count._all,
            spendAoa: decimalToNumber(item._sum.unitCost),
          })),
        },
        byCountry: countryGroups.map((item) => ({
          countryCode: item.countryCode ?? "UNKNOWN",
          count: item._count._all,
          spendAoa: decimalToNumber(item._sum.unitCost),
        })),
        provider: {
          name: "mimo-verify",
          smsOnly: true,
          credentialsConfigured: Boolean(
            process.env.MIMO_VERIFY_API_KEY &&
            process.env.MIMO_VERIFY_AUTH_HEADER_NAME &&
            process.env.MIMO_VERIFY_AUTH_HEADER_VALUE
          ),
          enabled:
            process.env.PHONE_OTP_ENABLED === "true" &&
            Boolean(
              process.env.MIMO_VERIFY_API_KEY &&
              process.env.MIMO_VERIFY_AUTH_HEADER_NAME &&
              process.env.MIMO_VERIFY_AUTH_HEADER_VALUE &&
              process.env.PHONE_OTP_PEPPER &&
              process.env.PHONE_OTP_PEPPER.length >= 32
            ),
          balanceAvailable: false,
          balanceAoa: null,
          note: "O saldo e os relatórios de entrega dependem da documentação e dos acessos confirmados pela MIMO.",
        },
      },
      {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error(
      "[MARKA_PHONE_OTP_ADMIN_USAGE_ERROR]",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json(
      { message: "Não foi possível consultar os custos SMS." },
      { status: 500 }
    );
  }
}
