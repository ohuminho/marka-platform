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

  const originalRoutingUrl = process.env.MOBILITY_ROUTING_BASE_URL;
  delete process.env.MOBILITY_ROUTING_BASE_URL;
  const publicDemoFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "router.project-osrm.org");
    return new Response(JSON.stringify({ code: "Ok", routes: [{ distance: 2500, duration: 420 }] }), { status: 200 });
  };
  const publicEstimate = await service.estimate(
    { latitude: -8.8, longitude: 13.2 },
    { latitude: -8.8, longitude: 4.9 },
    { fetcher: publicDemoFetch },
  );
  assert.equal(publicEstimate.distanceMeters, 2500);
  if (originalRoutingUrl !== undefined) process.env.MOBILITY_ROUTING_BASE_URL = originalRoutingUrl;

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

  const matrixFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/table/v1/driving/13.2,-8.8;13.21,-8.81;13.3,-8.9;13.22,-8.82;13.31,-8.91");
    assert.equal(url.searchParams.get("annotations"), "duration");
    return new Response(JSON.stringify({
      code: "Ok",
      durations: [
        [0, 120, 420, 150, 500],
        [120, 0, 300, 90, 420],
        [420, 300, 0, 330, 120],
        [150, 90, 330, 0, 300],
        [500, 420, 120, 300, 0],
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const durationMatrix = await service.getDurationMatrix(
    [
      { latitude: -8.8, longitude: 13.2 },
      { latitude: -8.81, longitude: 13.21 },
      { latitude: -8.9, longitude: 13.3 },
      { latitude: -8.82, longitude: 13.22 },
      { latitude: -8.91, longitude: 13.31 },
    ],
    { baseUrl: "https://routing.example.test", fetcher: matrixFetch },
  );
  assert.equal(durationMatrix.length, 5);
  assert.equal(durationMatrix[0][1], 120);

  const malformedMatrixFetch: typeof fetch = async () =>
    new Response(JSON.stringify({
      code: "Ok",
      durations: [[0, 10], [10, null]],
    }), { status: 200 });
  await assert.rejects(
    () => service.getDurationMatrix(
      [
        { latitude: -8.8, longitude: 13.2 },
        { latitude: -8.81, longitude: 13.21 },
      ],
      { baseUrl: "https://routing.example.test", fetcher: malformedMatrixFetch },
    ),
    (error: unknown) =>
      error instanceof MobilityRoutingError &&
      error.code === "MOBILITY_ROUTE_MATRIX_INVALID",
  );


  const orsFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "api.heigit.org");
    assert.equal(url.pathname, "/openrouteservice/v2/directions/driving-car/geojson");
    assert.equal((init?.headers as Record<string, string>).authorization, "test-free-key");
    assert.equal(init?.method, "POST");
    const body = JSON.parse(String(init?.body)) as { coordinates: number[][]; instructions: boolean };
    assert.deepEqual(body.coordinates, [[13.2, -8.8], [13.3, -8.9]]);
    assert.equal(body.instructions, false);
    return new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[13.2, -8.8], [13.25, -8.85], [13.3, -8.9]] },
        properties: { summary: { distance: 12_500, duration: 1_800 } },
      }],
    }), { status: 200, headers: { "content-type": "application/geo+json" } });
  };
  const orsService = new MobilityRoutingService();
  const orsRoute = await orsService.getGeometry(
    { latitude: -8.8, longitude: 13.2 },
    { latitude: -8.9, longitude: 13.3 },
    { provider: "OPENROUTESERVICE", apiKey: "test-free-key", fetcher: orsFetch },
  );
  assert.equal(orsRoute.provider, "OPENROUTESERVICE");
  assert.equal(orsRoute.distanceMeters, 12_500);
  assert.equal(orsRoute.durationSeconds, 1_800);
  assert.equal(orsRoute.geometry.coordinates.length, 3);

  await assert.rejects(
    () => orsService.estimate(
      { latitude: -8.8, longitude: 13.2 },
      { latitude: -8.9, longitude: 13.3 },
      { provider: "OPENROUTESERVICE", fetcher: orsFetch },
    ),
    (error: unknown) => error instanceof MobilityRoutingError && error.code === "MOBILITY_ROUTING_API_KEY_MISSING",
  );

  const orsMatrixFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/openrouteservice/v2/matrix/driving-car");
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({ durations: [[0, 120], [120, 0]] }), { status: 200 });
  };
  const orsMatrix = await orsService.getDurationMatrix(
    [{ latitude: -8.8, longitude: 13.2 }, { latitude: -8.81, longitude: 13.21 }],
    { provider: "OPENROUTESERVICE", apiKey: "test-free-key", fetcher: orsMatrixFetch },
  );
  assert.deepEqual(orsMatrix, [[0, 120], [120, 0]]);

  console.log("Mobility routing adapter tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
