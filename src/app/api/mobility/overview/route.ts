import { NextResponse } from "next/server";

import {
  authenticateMobilityRequest,
} from "@/app/api/mobility/_lib/auth";

import { prisma } from "@/database/client/prisma";

export async function GET(
  request: Request,
) {
  const authentication =
    await authenticateMobilityRequest(
      request,
    );

  if (!authentication.ok) {
    return authentication.response;
  }

  const organizationId =
    authentication.session.organizationId;

  try {
    const [
      rideCounts,
      orchestrationCounts,
      paymentCounts,
      settlementCounts,
      recentRides,
      recentEvents,
    ] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          status: string;
          count: number;
        }>
      >`
        SELECT
          "status"::text AS "status",
          COUNT(*)::int AS "count"
        FROM "MobilityRide"
        WHERE "organizationId" = ${organizationId}
        GROUP BY "status"
        ORDER BY "status"
      `,

      prisma.$queryRaw<
        Array<{
          status: string;
          count: number;
        }>
      >`
        SELECT
          "status"::text AS "status",
          COUNT(*)::int AS "count"
        FROM "MobilityRideOrchestration"
        WHERE "organizationId" = ${organizationId}
        GROUP BY "status"
        ORDER BY "status"
      `,

      prisma.$queryRaw<
        Array<{
          status: string;
          count: number;
        }>
      >`
        SELECT
          "status"::text AS "status",
          COUNT(*)::int AS "count"
        FROM "MobilityRidePayment"
        WHERE "organizationId" = ${organizationId}
        GROUP BY "status"
        ORDER BY "status"
      `,

      prisma.$queryRaw<
        Array<{
          status: string;
          count: number;
        }>
      >`
        SELECT
          "status"::text AS "status",
          COUNT(*)::int AS "count"
        FROM "MobilitySettlement"
        WHERE "organizationId" = ${organizationId}
        GROUP BY "status"
        ORDER BY "status"
      `,

      prisma.$queryRaw<
        Array<{
          id: string;
          reference: string;
          serviceType: string;
          status: string;
          currency: string;
          createdAt: Date;
          updatedAt: Date;
          orchestrationStatus: string | null;
          currentStep: string | null;
          orchestrationUpdatedAt: Date | null;
        }>
      >`
        SELECT
          r."id",
          r."reference",
          r."serviceType",
          r."status"::text AS "status",
          r."currency",
          r."createdAt",
          r."updatedAt",
          o."status"::text AS "orchestrationStatus",
          o."currentStep"::text AS "currentStep",
          o."updatedAt" AS "orchestrationUpdatedAt"
        FROM "MobilityRide" r
        LEFT JOIN "MobilityRideOrchestration" o
          ON o."rideId" = r."id"
        WHERE
          r."organizationId" = ${organizationId}
        ORDER BY
          r."createdAt" DESC
        LIMIT 12
      `,

      prisma.$queryRaw<
        Array<{
          id: string;
          rideId: string;
          action: string;
          fromStep: string | null;
          toStep: string;
          status: string;
          createdAt: Date;
        }>
      >`
        SELECT
          "id",
          "rideId",
          "action",
          "fromStep"::text AS "fromStep",
          "toStep"::text AS "toStep",
          "status"::text AS "status",
          "createdAt"
        FROM "MobilityRideOrchestrationEvent"
        WHERE "organizationId" = ${organizationId}
        ORDER BY "createdAt" DESC
        LIMIT 16
      `,
    ]);

    const sum =
      (
        rows: Array<{
          status: string;
          count: number;
        }>,
        statuses: string[],
      ) =>
        rows
          .filter((row) =>
            statuses.includes(row.status),
          )
          .reduce(
            (total, row) =>
              total + Number(row.count),
            0,
          );

    const rideMap =
      Object.fromEntries(
        rideCounts.map((row) => [
          row.status,
          Number(row.count),
        ]),
      );

    const orchestrationMap =
      Object.fromEntries(
        orchestrationCounts.map((row) => [
          row.status,
          Number(row.count),
        ]),
      );

    const paymentMap =
      Object.fromEntries(
        paymentCounts.map((row) => [
          row.status,
          Number(row.count),
        ]),
      );

    const settlementMap =
      Object.fromEntries(
        settlementCounts.map((row) => [
          row.status,
          Number(row.count),
        ]),
      );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),

      engines: {
        lifecycle: true,
        ride: true,
        stateMachine: true,
        pricing: true,
        matching: true,
        dispatch: true,
        assignment: true,
        safety: true,
        payment: true,
        cashSettlement: true,
        settlement: true,
        financialOrchestrator: true,
        financialCoreBridge: true,
        recovery: true,
        audit: true,
        idempotency: true,
      },

      metrics: {
        rides: {
          total:
            rideCounts.reduce(
              (total, row) =>
                total + Number(row.count),
              0,
            ),
          active:
            sum(rideCounts, [
              "REQUESTED",
              "SEARCHING",
              "MATCHED",
              "DRIVER_ASSIGNED",
              "DRIVER_ARRIVING",
              "DRIVER_ARRIVED",
              "TRIP_STARTED",
              "TRIP_IN_PROGRESS",
            ]),
          completed:
            rideMap.TRIP_COMPLETED ?? 0,
          cancelled:
            rideMap.CANCELLED ?? 0,
          failed:
            rideMap.FAILED ?? 0,
          noDriverFound:
            rideMap.NO_DRIVER_FOUND ?? 0,
        },

        orchestration: {
          active:
            sum(orchestrationCounts, [
              "ACTIVE",
            ]),
          completed:
            orchestrationMap.COMPLETED ?? 0,
          failed:
            orchestrationMap.FAILED ?? 0,
          recoveryRequired:
            orchestrationMap.RECOVERY_REQUIRED ??
            0,
          cancelled:
            orchestrationMap.CANCELLED ?? 0,
        },

        payments: {
          pending:
            paymentMap.PENDING ?? 0,
          authorized:
            paymentMap.AUTHORIZED ?? 0,
          collected:
            paymentMap.COLLECTED ?? 0,
          settled:
            paymentMap.SETTLED ?? 0,
          failed:
            paymentMap.FAILED ?? 0,
          disputed:
            paymentMap.DISPUTED ?? 0,
        },

        settlements: {
          pending:
            settlementMap.PENDING ?? 0,
          processing:
            settlementMap.PROCESSING ?? 0,
          completed:
            settlementMap.COMPLETED ?? 0,
          failed:
            settlementMap.FAILED ?? 0,
        },
      },

      recentRides,

      recentEvents,
    });
  } catch (error) {
    console.error(
      "[MOBILITY_OVERVIEW_API_ERROR]",
      error,
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to retrieve Mobility operational overview.",
        code:
          "MOBILITY_OVERVIEW_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
