export interface MobilityRoutePoint {
  latitude: number;
  longitude: number;
}

export interface MobilityRouteEstimate {
  distanceMeters: number;
  durationSeconds: number;
  provider: "OSRM";
  profile: "driving";
}

export interface MobilityRoutingOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export class MobilityRoutingError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "MobilityRoutingError";
  }
}

/**
 * Server-side OSRM adapter. No browser-supplied distance/duration is accepted.
 * The base URL must point to an operator-controlled or contractually approved
 * OSRM deployment; the public demo server is deliberately not used as fallback.
 */
export class MobilityRoutingService {
  async estimate(
    origin: MobilityRoutePoint,
    destination: MobilityRoutePoint,
    options: MobilityRoutingOptions = {},
  ): Promise<MobilityRouteEstimate> {
    validatePoint(origin, "origin");
    validatePoint(destination, "destination");

    const baseUrl =
      options.baseUrl ??
      process.env.MOBILITY_ROUTING_BASE_URL;

    if (!baseUrl) {
      throw new MobilityRoutingError(
        "Mobility routing provider is not configured.",
        "MOBILITY_ROUTING_NOT_CONFIGURED",
      );
    }

    let endpoint: URL;
    try {
      endpoint = new URL(
        `route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
        ensureTrailingSlash(baseUrl),
      );
    } catch {
      throw new MobilityRoutingError(
        "Mobility routing provider URL is invalid.",
        "MOBILITY_ROUTING_CONFIGURATION_INVALID",
      );
    }

    endpoint.searchParams.set("overview", "false");
    endpoint.searchParams.set("steps", "false");
    endpoint.searchParams.set("alternatives", "false");

    const timeoutMs = options.timeoutMs ?? 5_000;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 15_000) {
      throw new MobilityRoutingError(
        "Mobility routing timeout configuration is invalid.",
        "MOBILITY_ROUTING_TIMEOUT_INVALID",
      );
    }

    const fetcher = options.fetcher ?? fetch;
    let response: Response;
    try {
      response = await fetcher(endpoint, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new MobilityRoutingError(
        "Mobility routing provider is unavailable.",
        "MOBILITY_ROUTING_PROVIDER_UNAVAILABLE",
      );
    }

    if (!response.ok) {
      throw new MobilityRoutingError(
        "Mobility routing provider returned an unsuccessful response.",
        "MOBILITY_ROUTING_PROVIDER_ERROR",
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new MobilityRoutingError(
        "Mobility routing provider returned invalid JSON.",
        "MOBILITY_ROUTING_INVALID_RESPONSE",
      );
    }

    if (!isRecord(payload) || payload.code !== "Ok" || !Array.isArray(payload.routes)) {
      throw new MobilityRoutingError(
        "No drivable route was found for the selected locations.",
        "MOBILITY_ROUTE_NOT_FOUND",
      );
    }

    const route = payload.routes[0];
    if (
      !isRecord(route) ||
      typeof route.distance !== "number" ||
      !Number.isFinite(route.distance) ||
      route.distance <= 0 ||
      route.distance > 2_000_000 ||
      typeof route.duration !== "number" ||
      !Number.isFinite(route.duration) ||
      route.duration <= 0 ||
      route.duration > 7 * 24 * 60 * 60
    ) {
      throw new MobilityRoutingError(
        "Mobility routing provider returned invalid route measurements.",
        "MOBILITY_ROUTE_MEASUREMENTS_INVALID",
      );
    }

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      provider: "OSRM",
      profile: "driving",
    };
  }
}

function validatePoint(point: MobilityRoutePoint, label: string): void {
  if (
    !point ||
    !Number.isFinite(point.latitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    !Number.isFinite(point.longitude) ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    throw new MobilityRoutingError(
      `Mobility ${label} coordinates are invalid.`,
      "MOBILITY_COORDINATES_INVALID",
    );
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const mobilityRoutingService = new MobilityRoutingService();
