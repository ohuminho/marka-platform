import { NextResponse } from "next/server";
import { prisma } from "@/database/client/prisma";
import { authenticateMobilityRequest } from "@/app/api/mobility/_lib/auth";
import { mobilityCashSettlementService } from "@/services/mobility/payments/mobility-cash-settlement.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authentication = await authenticateMobilityRequest(request);
  if (!authentication.ok) return authentication.response;

  try {
    const driver = await prisma.mobilityDriver.findFirst({
      where: {
        userId: authentication.session.userId,
        organizationId: authentication.session.organizationId,
      },
      select: { id: true },
    });

    if (!driver) {
      return NextResponse.json({
        financials: {
          currency: "AOA",
          outstandingAmountMinor: "0",
          obligationsCount: 0,
          obligations: [],
          settlements: [],
        },
      }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }

    const [balance, obligations, settlements] = await Promise.all([
      mobilityCashSettlementService.getDriverOutstandingBalance({
        organizationId: authentication.session.organizationId,
        driverId: driver.id,
        currency: "AOA",
      }),
      mobilityCashSettlementService.getDriverObligations({
        organizationId: authentication.session.organizationId,
        driverId: driver.id,
        currency: "AOA",
      }),
      prisma.$queryRaw<Array<{
        id: string;
        obligationId: string;
        rideId: string;
        settlementReference: string;
        sourceReference: string;
        amountMinor: bigint;
        currency: string;
        createdAt: Date;
      }>>`
        SELECT
          settlement."id",
          settlement."obligationId",
          obligation."rideId",
          settlement."settlementReference",
          settlement."sourceReference",
          settlement."amountMinor",
          settlement."currency",
          settlement."createdAt"
        FROM "MobilityCashObligationSettlement" settlement
        INNER JOIN "MobilityCashObligation" obligation
          ON obligation."id" = settlement."obligationId"
        WHERE
          settlement."organizationId" = ${authentication.session.organizationId}
          AND obligation."driverId" = ${driver.id}
        ORDER BY settlement."createdAt" DESC
        LIMIT 50
      `,
    ]);

    return NextResponse.json({
      financials: {
        currency: balance.currency,
        outstandingAmountMinor: balance.outstandingAmountMinor,
        obligationsCount: balance.obligationsCount,
        obligations: obligations.map((item) => ({
          id: item.id,
          rideId: item.rideId,
          grossFareMinor: item.grossFareMinor,
          commissionAmountMinor: item.commissionAmountMinor,
          settledAmountMinor: item.settledAmountMinor,
          remainingAmountMinor: item.remainingAmountMinor,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        settlements: settlements.map((item) => ({
          id: item.id,
          obligationId: item.obligationId,
          rideId: item.rideId,
          settlementReference: item.settlementReference,
          sourceReference: item.sourceReference,
          amountMinor: item.amountMinor.toString(),
          currency: item.currency,
          createdAt: item.createdAt,
        })),
      },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("[MARKA_MOBILITY_DRIVER_FINANCIALS_ERROR]", error);
    return NextResponse.json({
      message: "Não foi possível carregar o histórico financeiro da Mobility.",
      code: "DRIVER_FINANCIALS_UNAVAILABLE",
    }, { status: 500 });
  }
}
