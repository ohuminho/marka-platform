export interface MobilityRoutePoint { latitude: number; longitude: number; }
export type MobilityRoutingProvider = "OSRM" | "OPENROUTESERVICE";
export interface MobilityRouteEstimate { distanceMeters: number; durationSeconds: number; provider: MobilityRoutingProvider; profile: "driving"; }
export interface MobilityRouteGeometry extends MobilityRouteEstimate { geometry: { type: "LineString"; coordinates: [number,number][] }; }
export interface MobilityRoutingOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  provider?: MobilityRoutingProvider;
  apiKey?: string;
}
type RouteResult = { distance: number; duration: number; geometry?: unknown };

export class MobilityRoutingError extends Error {
  constructor(message: string, readonly code: string) { super(message); this.name = "MobilityRoutingError"; }
}

export class MobilityRoutingService {
  private provider(options: MobilityRoutingOptions): MobilityRoutingProvider {
    const configured = options.provider ?? process.env.MOBILITY_ROUTING_PROVIDER ?? "OSRM";
    if (configured !== "OSRM" && configured !== "OPENROUTESERVICE") {
      throw new MobilityRoutingError("Mobility routing provider configuration is invalid.", "MOBILITY_ROUTING_CONFIGURATION_INVALID");
    }
    return configured;
  }

  private baseUrl(options: MobilityRoutingOptions, provider: MobilityRoutingProvider): string {
    if (options.baseUrl) return options.baseUrl;
    if (provider === "OPENROUTESERVICE") {
      return process.env.OPENROUTESERVICE_BASE_URL ?? "https://api.heigit.org/openrouteservice/";
    }
    // Public OSRM demo remains the no-key development fallback only.
    return process.env.MOBILITY_ROUTING_BASE_URL ?? "https://router.project-osrm.org/";
  }

  private apiKey(options: MobilityRoutingOptions): string {
    const key = options.apiKey ?? process.env.OPENROUTESERVICE_API_KEY;
    if (!key?.trim()) {
      throw new MobilityRoutingError(
        "A chave gratuita do OpenRouteService ainda não está configurada no servidor da MARKA.",
        "MOBILITY_ROUTING_API_KEY_MISSING",
      );
    }
    return key.trim();
  }

  private timeout(options: MobilityRoutingOptions): number {
    const timeout = options.timeoutMs ?? 8_000;
    if (!Number.isInteger(timeout) || timeout < 500 || timeout > 15_000) {
      throw new MobilityRoutingError("Mobility routing timeout configuration is invalid.", "MOBILITY_ROUTING_TIMEOUT_INVALID");
    }
    return timeout;
  }

  async estimate(origin: MobilityRoutePoint, destination: MobilityRoutePoint, options: MobilityRoutingOptions = {}): Promise<MobilityRouteEstimate> {
    const provider = this.provider(options);
    const result = await this.request(origin, destination, options, false);
    return { distanceMeters: result.distance, durationSeconds: result.duration, provider, profile: "driving" };
  }

  async getGeometry(origin: MobilityRoutePoint, destination: MobilityRoutePoint, options: MobilityRoutingOptions = {}): Promise<MobilityRouteGeometry> {
    const provider = this.provider(options);
    const result = await this.request(origin, destination, options, true);
    return {
      distanceMeters: result.distance,
      durationSeconds: result.duration,
      provider,
      profile: "driving",
      geometry: result.geometry as { type: "LineString"; coordinates: [number,number][] },
    };
  }

  async getDurationMatrix(points: readonly MobilityRoutePoint[], options: MobilityRoutingOptions = {}): Promise<number[][]> {
    if (points.length < 2 || points.length > 5) {
      throw new MobilityRoutingError("Mobility route matrix requires between two and five points.", "MOBILITY_ROUTE_MATRIX_SIZE_INVALID");
    }
    points.forEach((point, index) => validatePoint(point, `point ${index}`));
    const provider = this.provider(options);
    const timeout = this.timeout(options);
    const coordinates = points.map((point) => [point.longitude, point.latitude]);

    let endpoint: URL;
    const headers: Record<string, string> = { accept: "application/json" };
    let init: RequestInit;
    try {
      if (provider === "OPENROUTESERVICE") {
        endpoint = new URL("openrouteservice/v2/matrix/driving-car", this.baseUrl(options, provider).endsWith("/") ? this.baseUrl(options, provider) : `${this.baseUrl(options, provider)}/`);
        headers["content-type"] = "application/json";
        headers.authorization = this.apiKey(options);
        init = { method: "POST", headers, body: JSON.stringify({ locations: coordinates, metrics: ["duration"], units: "m" }), cache: "no-store", signal: AbortSignal.timeout(timeout) };
      } else {
        const path = coordinates.map(([lon, lat]) => `${lon},${lat}`).join(";");
        endpoint = new URL(`table/v1/driving/${path}`, this.baseUrl(options, provider).endsWith("/") ? this.baseUrl(options, provider) : `${this.baseUrl(options, provider)}/`);
        endpoint.searchParams.set("annotations", "duration");
        init = { method: "GET", headers, cache: "no-store", signal: AbortSignal.timeout(timeout) };
      }
    } catch (error) {
      if (error instanceof MobilityRoutingError) throw error;
      throw new MobilityRoutingError("Mobility routing provider configuration is invalid.", "MOBILITY_ROUTING_CONFIGURATION_INVALID");
    }

    const payload = await this.fetchJson(endpoint, init, options);
    const matrix = provider === "OPENROUTESERVICE"
      ? isRecord(payload) && isRecord(payload.durations) ? payload.durations.durations : null
      : isRecord(payload) && payload.code === "Ok" ? payload.durations : null;
    if (!Array.isArray(matrix) || matrix.length !== points.length || matrix.some((row) =>
      !Array.isArray(row) || row.length !== points.length || row.some((duration) =>
        typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || duration > 604_800
      )
    )) {
      throw new MobilityRoutingError("No complete route matrix was found for the selected locations.", "MOBILITY_ROUTE_MATRIX_INVALID");
    }
    return matrix as number[][];
  }

  private async request(origin: MobilityRoutePoint, destination: MobilityRoutePoint, options: MobilityRoutingOptions, geometry: boolean): Promise<RouteResult> {
    validatePoint(origin, "origin");
    validatePoint(destination, "destination");
    const provider = this.provider(options);
    const timeout = this.timeout(options);
    let endpoint: URL;
    let init: RequestInit;
    try {
      if (provider === "OPENROUTESERVICE") {
        const base = this.baseUrl(options, provider);
        endpoint = new URL("openrouteservice/v2/directions/driving-car/geojson", base.endsWith("/") ? base : `${base}/`);
        const headers: Record<string, string> = { accept: "application/geo+json, application/json", "content-type": "application/json", authorization: this.apiKey(options) };
        init = {
          method: "POST",
          headers,
          body: JSON.stringify({
            coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]],
            instructions: false,
            geometry: true,
            geometry_simplify: false,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(timeout),
        };
      } else {
        const base = this.baseUrl(options, provider);
        endpoint = new URL(
          `route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
          base.endsWith("/") ? base : `${base}/`,
        );
        endpoint.searchParams.set("overview", geometry ? "full" : "false");
        endpoint.searchParams.set("steps", "false");
        endpoint.searchParams.set("alternatives", "false");
        if (geometry) endpoint.searchParams.set("geometries", "geojson");
        init = { method: "GET", headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(timeout) };
      }
    } catch (error) {
      if (error instanceof MobilityRoutingError) throw error;
      throw new MobilityRoutingError("Mobility routing provider URL is invalid.", "MOBILITY_ROUTING_CONFIGURATION_INVALID");
    }

    const payload = await this.fetchJson(endpoint, init, options);
    let distance: unknown;
    let duration: unknown;
    let routeGeometry: unknown;

    if (provider === "OPENROUTESERVICE") {
      const feature = isRecord(payload) && Array.isArray(payload.features) ? payload.features[0] : null;
      const properties = isRecord(feature) && isRecord(feature.properties) ? feature.properties : null;
      const summary = properties && isRecord(properties.summary) ? properties.summary : null;
      distance = summary?.distance;
      duration = summary?.duration;
      routeGeometry = isRecord(feature) ? feature.geometry : null;
    } else {
      const item = isRecord(payload) && payload.code === "Ok" && Array.isArray(payload.routes) ? payload.routes[0] : null;
      distance = isRecord(item) ? item.distance : null;
      duration = isRecord(item) ? item.duration : null;
      routeGeometry = isRecord(item) ? item.geometry : null;
    }

    if (typeof distance !== "number" || !Number.isFinite(distance) || distance <= 0 || distance > 2_000_000 ||
        typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0 || duration > 604_800) {
      throw new MobilityRoutingError("No valid drivable route was returned for the selected locations.", "MOBILITY_ROUTE_MEASUREMENTS_INVALID");
    }

    if (geometry) validateGeometry(routeGeometry);
    return { distance, duration, geometry: geometry ? routeGeometry : undefined };
  }

  private async fetchJson(endpoint: URL, init: RequestInit, options: MobilityRoutingOptions): Promise<unknown> {
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(endpoint, init);
    } catch {
      throw new MobilityRoutingError("O serviço de rotas está temporariamente indisponível.", "MOBILITY_ROUTING_PROVIDER_UNAVAILABLE");
    }
    if (response.status === 429) {
      throw new MobilityRoutingError("O limite gratuito de pedidos do serviço de rotas foi atingido. Tenta novamente mais tarde.", "MOBILITY_ROUTING_PROVIDER_RATE_LIMITED");
    }
    if (!response.ok) {
      throw new MobilityRoutingError("O serviço de rotas recusou o pedido ou devolveu um erro.", "MOBILITY_ROUTING_PROVIDER_ERROR");
    }
    try {
      return await response.json();
    } catch {
      throw new MobilityRoutingError("O serviço de rotas devolveu uma resposta inválida.", "MOBILITY_ROUTING_INVALID_RESPONSE");
    }
  }
}

function validatePoint(point: MobilityRoutePoint, label: string): void {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 ||
      !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new MobilityRoutingError(`Invalid ${label} coordinates.`, "MOBILITY_COORDINATES_INVALID");
  }
}
function validateGeometry(value: unknown): asserts value is { type: "LineString"; coordinates: [number, number][] } {
  if (!isRecord(value) || value.type !== "LineString" || !Array.isArray(value.coordinates) ||
      value.coordinates.length < 2 || value.coordinates.length > 10_000) {
    throw new MobilityRoutingError("Mobility routing provider returned invalid route geometry.", "MOBILITY_ROUTE_GEOMETRY_INVALID");
  }
  for (const pair of value.coordinates) {
    if (!Array.isArray(pair) || typeof pair[0] !== "number" || typeof pair[1] !== "number") {
      throw new MobilityRoutingError("Mobility routing provider returned invalid route geometry.", "MOBILITY_ROUTE_GEOMETRY_INVALID");
    }
    try { validatePoint({ longitude: pair[0], latitude: pair[1] }, "route"); }
    catch { throw new MobilityRoutingError("Mobility routing provider returned invalid route geometry.", "MOBILITY_ROUTE_GEOMETRY_INVALID"); }
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const mobilityRoutingService = new MobilityRoutingService();
