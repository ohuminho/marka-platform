import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { quoteMobilityFare } from "@/services/mobility/pricing/mobility-tariff.service";
import {
  MobilityRoutingError,
  mobilityRoutingService,
} from "@/services/mobility/pricing/mobility-routing.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const mobilityServiceTypeSchema = z.enum(["TAXI","EXECUTIVE","MOTO_TAXI","VAN","MINIBUS","BUS","COACH","PICKUP","LIGHT_TRUCK","MEDIUM_TRUCK","TIPPER_TRUCK","HEAVY_TRUCK"]);

const coordinatesSchema = z.object({
  originLat: z.coerce.number().finite().min(-90).max(90),
  originLng: z.coerce.number().finite().min(-180).max(180),
  destinationLat: z.coerce.number().finite().min(-90).max(90),
  destinationLng: z.coerce.number().finite().min(-180).max(180),
  serviceType: mobilityServiceTypeSchema.optional(),
  serviceTypes: z.string().max(256).optional(),
}).strict();

export async function GET(request: Request) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" },
        { status: 401 },
      );
    }

    const session = await new SessionService().validate(token);
    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session.", code: "INVALID_SESSION" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "User account is not available.", code: "USER_ACCOUNT_UNAVAILABLE" },
        { status: 401 },
      );
    }

    const parsed = coordinatesSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Route coordinates are invalid.", code: "MOBILITY_COORDINATES_INVALID" },
        { status: 400 },
      );
    }

    const quota = await reserveApiRequest({
      scope: "MOBILITY_ROUTE_GEOMETRY",
      actorUserId: session.userId,
      windows: [
        { limit: 10, windowMs: 60_000 },
        { limit: 100, windowMs: 24 * 60 * 60 * 1000 },
      ],
    });
    if (!quota.allowed) {
      return NextResponse.json(
        { message: "Route request limit reached.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(quota.retryAfterSeconds),
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    // A per-user quota protects individual accounts; this shared quota also
    // protects the public routing provider from aggregate traffic across users.
    const globalQuota = await reserveApiRequest({
      scope: "MOBILITY_ROUTE_GEOMETRY_GLOBAL",
      anonymousIdentity: "marka:shared-osrm-geometry-provider",
      windows: [
        { limit: 60, windowMs: 60_000 },
        { limit: 2_000, windowMs: 24 * 60 * 60 * 1000 },
      ],
    });
    if (!globalQuota.allowed) {
      return NextResponse.json(
        { message: "O serviço de rotas está temporariamente ocupado. Tenta novamente dentro de instantes.", code: "ROUTING_PROVIDER_CAPACITY" },
        {
          status: 429,
          headers: {
            "Retry-After": String(globalQuota.retryAfterSeconds),
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    const route = await mobilityRoutingService.getGeometry(
      {
        latitude: parsed.data.originLat,
        longitude: parsed.data.originLng,
      },
      {
        latitude: parsed.data.destinationLat,
        longitude: parsed.data.destinationLng,
      },
    );

    const requestedServiceTypes = parsed.data.serviceTypes
      ? parsed.data.serviceTypes.split(",").map((value) => value.trim()).filter(Boolean)
      : parsed.data.serviceType
        ? [parsed.data.serviceType]
        : [];
    const validatedServiceTypes = z.array(mobilityServiceTypeSchema).max(12).safeParse([...new Set(requestedServiceTypes)]);
    if (!validatedServiceTypes.success) {
      return NextResponse.json(
        { message: "One or more Mobility service types are invalid.", code: "MOBILITY_SERVICE_TYPE_INVALID" },
        { status: 400 },
      );
    }

    const fares = Object.fromEntries(
      validatedServiceTypes.data.map((type) => [
        type,
        quoteMobilityFare(type, route.distanceMeters, route.durationSeconds),
      ]),
    );
    const fare = parsed.data.serviceType ? fares[parsed.data.serviceType] ?? null : null;

    return NextResponse.json(
      {
        route,
        fare,
        fares,
        fareStatus: fare ? "AVAILABLE" : "TARIFF_NOT_CONFIGURED",
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const code =
      error instanceof MobilityRoutingError
        ? error.code
        : "MOBILITY_ROUTING_PROVIDER_UNAVAILABLE";
    const status =
      code === "MOBILITY_COORDINATES_INVALID"
        ? 400
        : code === "MOBILITY_ROUTE_NOT_FOUND"
          ? 422
          : 503;
    return NextResponse.json(
      { message: "The MARKA route service is not available for this journey.", code },
      { status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}
