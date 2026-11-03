import assert from "node:assert/strict";
import {
  MobilityRoutingError,
  MobilityRoutingService,
} from "../../../src/services/mobility/pricing/mobility-routing.service";

async function main() {\nconst service = new MobilityRoutingService();

const validFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  assert.match(url.pathname, /route\/v1\/driving\/4\.9,-?8\.8;13\.2,-?8\.8$/);
  return new Response(JSON.stringify({
    code: "Ok",
    routes: [{ distance: 12_500.5, duration: 1_800 }],
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const estimate = await service.estimate(
  { latitude: -8.8, longitude: 13.2 },
  { latitude: -8.8, longitude: 4.9 },
  { baseUrl: "https://routing.example.test", fetcher: validFetch },
);
assert.equal(estimate.distanceMeters, 12_500.5);
assert.equal(estimate.durationSeconds, 1_800);
assert.equal(estimate.provider, "OSRM");

await assert.rejects(
  () => service.estimate(
    { latitude: 91, longitude: 13.2 },
    { latitude: -8.8, longitude: 4.9 },
    { baseUrl: "https://routing.example.test", fetcher: validFetch },
  ),
  (error: unknown) =>
    error instanceof MobilityRoutingError &&
    error.code === "MOBILITY_COORDINATES_INVALID",
);

await assert.rejects(
  () => service.estimate(
    { latitude: -8.8, longitude: 13.2 },
    { latitude: -8.8, longitude: 4.9 },
    { fetcher: validFetch },
  ),
  (error: unknown) =>
    error instanceof MobilityRoutingError &&
    error.code === "MOBILITY_ROUTING_NOT_CONFIGURED",
);

const malformedFetch: typeof fetch = async () =>
  new Response(JSON.stringify({
    code: "Ok",
    routes: [{ distance: -1, duration: 20 }],
  }), { status: 200 });

await assert.rejects(
  () => service.estimate(
    { latitude: -8.8, longitude: 13.2 },
    { latitude: -8.8, longitude: 4.9 },
    { baseUrl: "https://routing.example.test", fetcher: malformedFetch },
  ),
  (error: unknown) =>
    error instanceof MobilityRoutingError &&
    error.code === "MOBILITY_ROUTE_MEASUREMENTS_INVALID",
);

console.log("Mobility routing adapter tests passed.");\n}\n\nvoid main().catch((error) => { console.error(error); process.exitCode = 1; });
