import assert from "node:assert/strict";
import {
  MobilityRoutingError,
  MobilityRoutingService,
} from "../../../src/services/mobility/pricing/mobility-routing.service";

async function main(): Promise<void> {
  const service = new MobilityRoutingService();

  const validFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/route/v1/driving/13.2,-8.8;4.9,-8.8");
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

  const geometryFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("overview"), "full");
    assert.equal(url.searchParams.get("geometries"), "geojson");
    return new Response(JSON.stringify({
      code: "Ok",
      routes: [{
        distance: 12_500.5,
        duration: 1_800,
        geometry: {
          type: "LineString",
          coordinates: [[13.2, -8.8], [13.25, -8.85], [13.3, -8.9]],
        },
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const route = await service.getGeometry(
    { latitude: -8.8, longitude: 13.2 },
    { latitude: -8.9, longitude: 13.3 },
    { baseUrl: "https://routing.example.test", fetcher: geometryFetch },
  );
  assert.equal(route.geometry.type, "LineString");
  assert.equal(route.geometry.coordinates.length, 3);
  assert.deepEqual(route.geometry.coordinates[0], [13.2, -8.8]);

  const malformedGeometryFetch: typeof fetch = async () =>
    new Response(JSON.stringify({
      code: "Ok",
      routes: [{
        distance: 100,
        duration: 20,
        geometry: { type: "LineString", coordinates: [[999, -8.8], [13.3, -8.9]] },
      }],
    }), { status: 200 });

  await assert.rejects(
    () => service.getGeometry(
      { latitude: -8.8, longitude: 13.2 },
      { latitude: -8.9, longitude: 13.3 },
      { baseUrl: "https://routing.example.test", fetcher: malformedGeometryFetch },
    ),
    (error: unknown) =>
      error instanceof MobilityRoutingError &&
      error.code === "MOBILITY_ROUTE_GEOMETRY_INVALID",
  );

  console.log("Mobility routing adapter tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
