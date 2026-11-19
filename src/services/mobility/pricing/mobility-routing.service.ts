export interface MobilityRoutePoint { latitude: number; longitude: number; }
export interface MobilityRouteEstimate { distanceMeters: number; durationSeconds: number; provider: "OSRM"; profile: "driving"; }
export interface MobilityRouteGeometry extends MobilityRouteEstimate { geometry: { type: "LineString"; coordinates: [number,number][] }; }
export interface MobilityRoutingOptions { baseUrl?: string; timeoutMs?: number; fetcher?: typeof fetch; }
export class MobilityRoutingError extends Error {
  constructor(message: string, readonly code: string) { super(message); this.name = "MobilityRoutingError"; }
}
export class MobilityRoutingService {
  private baseUrl(options: MobilityRoutingOptions) {
    // Public OSRM demo is a zero-cost pilot fallback; move to a self-hosted OSRM
    // instance through MOBILITY_ROUTING_BASE_URL before sustained commercial traffic.
    return options.baseUrl ?? process.env.MOBILITY_ROUTING_BASE_URL ?? "https://router.project-osrm.org/";
  }
  async estimate(origin: MobilityRoutePoint, destination: MobilityRoutePoint, options: MobilityRoutingOptions = {}): Promise<MobilityRouteEstimate> {
    const result = await this.request(origin,destination,options,false);
    return {distanceMeters:result.distance,durationSeconds:result.duration,provider:"OSRM",profile:"driving"};
  }
  async getGeometry(origin: MobilityRoutePoint, destination: MobilityRoutePoint, options: MobilityRoutingOptions = {}): Promise<MobilityRouteGeometry> {
    const result = await this.request(origin,destination,options,true);
    return {distanceMeters:result.distance,durationSeconds:result.duration,provider:"OSRM",profile:"driving",geometry:result.geometry as {type:"LineString";coordinates:[number,number][]}};
  }
  async getDurationMatrix(
    points: readonly MobilityRoutePoint[],
    options: MobilityRoutingOptions = {},
  ): Promise<number[][]> {
    if (points.length < 2 || points.length > 5) {
      throw new MobilityRoutingError(
        "Mobility route matrix requires between two and five points.",
        "MOBILITY_ROUTE_MATRIX_SIZE_INVALID",
      );
    }
    points.forEach((point, index) => validatePoint(point, `point ${index}`));

    const base = this.baseUrl(options);
    let endpoint: URL;
    try {
      const coordinates = points
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(";");
      endpoint = new URL(
        `table/v1/driving/${coordinates}`,
        base.endsWith("/") ? base : `${base}/`,
      );
    } catch {
      throw new MobilityRoutingError(
        "Mobility routing provider URL is invalid.",
        "MOBILITY_ROUTING_CONFIGURATION_INVALID",
      );
    }
    endpoint.searchParams.set("annotations", "duration");

    const timeout = options.timeoutMs ?? 1_000;
    if (!Number.isInteger(timeout) || timeout < 250 || timeout > 5_000) {
      throw new MobilityRoutingError(
        "Mobility routing timeout configuration is invalid.",
        "MOBILITY_ROUTING_TIMEOUT_INVALID",
      );
    }

    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(endpoint, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
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
    if (!record(payload) || payload.code !== "Ok" || !Array.isArray(payload.durations)) {
      throw new MobilityRoutingError(
        "No complete route matrix was found for the selected locations.",
        "MOBILITY_ROUTE_MATRIX_NOT_FOUND",
      );
    }

    const matrix = payload.durations;
    if (
      matrix.length !== points.length ||
      matrix.some((row) =>
        !Array.isArray(row) ||
        row.length !== points.length ||
        row.some((duration) =>
          typeof duration !== "number" ||
          !Number.isFinite(duration) ||
          duration < 0 ||
          duration > 604_800
        )
      )
    ) {
      throw new MobilityRoutingError(
        "Mobility routing provider returned an invalid duration matrix.",
        "MOBILITY_ROUTE_MATRIX_INVALID",
      );
    }
    return matrix as number[][];
  }

  private async request(origin:MobilityRoutePoint,destination:MobilityRoutePoint,options:MobilityRoutingOptions,geometry:boolean):Promise<{distance:number;duration:number;geometry?:unknown}> {
    validatePoint(origin,"origin");validatePoint(destination,"destination");
    let endpoint:URL;
    try { endpoint=new URL("route/v1/driving/"+origin.longitude+","+origin.latitude+";"+destination.longitude+","+destination.latitude,this.baseUrl(options).endsWith("/")?this.baseUrl(options):this.baseUrl(options)+"/"); }
    catch { throw new MobilityRoutingError("Mobility routing provider URL is invalid.","MOBILITY_ROUTING_CONFIGURATION_INVALID"); }
    endpoint.searchParams.set("overview",geometry?"full":"false");endpoint.searchParams.set("steps","false");endpoint.searchParams.set("alternatives","false");if(geometry)endpoint.searchParams.set("geometries","geojson");
    // Keep both attempts inside the serverless request budget; a slow public OSRM\n    // request must not hold the passenger flow open for 24+ seconds.\n    const timeout=options.timeoutMs??1000;
    if(!Number.isInteger(timeout)||timeout<250||timeout>5000)throw new MobilityRoutingError("Mobility routing timeout configuration is invalid.","MOBILITY_ROUTING_TIMEOUT_INVALID");
    let response:Response|undefined;
    for(let attempt=0;attempt<1;attempt++){
      try{
        response=await(options.fetcher??fetch)(endpoint,{method:"GET",headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(timeout)});
        if(response.ok)break;
        if(response.status<500&&response.status!==429)throw new MobilityRoutingError("Mobility routing provider returned an unsuccessful response.","MOBILITY_ROUTING_PROVIDER_ERROR");
      }catch(error){
        if(error instanceof MobilityRoutingError)throw error;
        if(attempt===1)throw new MobilityRoutingError("O serviço de rotas não respondeu após nova tentativa.","MOBILITY_ROUTING_PROVIDER_UNAVAILABLE");
      }
    }
    if(!response)throw new MobilityRoutingError("Mobility routing provider is unavailable.","MOBILITY_ROUTING_PROVIDER_UNAVAILABLE");
    if(!response.ok)throw new MobilityRoutingError("O serviço de rotas está temporariamente ocupado. Tenta novamente dentro de instantes.","MOBILITY_ROUTING_PROVIDER_ERROR");
    let payload:unknown;try{payload=await response.json();}catch{throw new MobilityRoutingError("Mobility routing provider returned invalid JSON.","MOBILITY_ROUTING_INVALID_RESPONSE");}
    if(!record(payload)||payload.code!=="Ok"||!Array.isArray(payload.routes))throw new MobilityRoutingError("No drivable route was found for the selected locations.","MOBILITY_ROUTE_NOT_FOUND");
    const item=payload.routes[0];if(!record(item)||typeof item.distance!=="number"||!Number.isFinite(item.distance)||item.distance<=0||item.distance>2000000||typeof item.duration!=="number"||!Number.isFinite(item.duration)||item.duration<=0||item.duration>604800)throw new MobilityRoutingError("Mobility routing provider returned invalid route measurements.","MOBILITY_ROUTE_MEASUREMENTS_INVALID");
    let routeGeometry:unknown;
    if(geometry){routeGeometry=item.geometry;if(!record(routeGeometry)||routeGeometry.type!=="LineString"||!Array.isArray(routeGeometry.coordinates)||routeGeometry.coordinates.length<2||routeGeometry.coordinates.length>10000)throw new MobilityRoutingError("Mobility routing provider returned invalid route geometry.","MOBILITY_ROUTE_GEOMETRY_INVALID");
      for(const pair of routeGeometry.coordinates){if(!Array.isArray(pair)||typeof pair[0]!=="number"||typeof pair[1]!=="number")throw new MobilityRoutingError("Mobility routing provider returned invalid route geometry.","MOBILITY_ROUTE_GEOMETRY_INVALID");try{validatePoint({longitude:pair[0],latitude:pair[1]},"route");}catch{throw new MobilityRoutingError("Mobility routing provider returned invalid route geometry.","MOBILITY_ROUTE_GEOMETRY_INVALID");}}
    }
    return {distance:item.distance,duration:item.duration,geometry:routeGeometry};
  }
}
function validatePoint(p:MobilityRoutePoint,label:string){if(!Number.isFinite(p.latitude)||p.latitude< -90||p.latitude>90||!Number.isFinite(p.longitude)||p.longitude< -180||p.longitude>180)throw new MobilityRoutingError("Invalid "+label+" coordinates.","MOBILITY_COORDINATES_INVALID");}
function record(v:unknown):v is Record<string,unknown>{return typeof v==="object"&&v!==null&&!Array.isArray(v);}
export const mobilityRoutingService=new MobilityRoutingService();
