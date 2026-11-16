import assert from "node:assert/strict";

import {
  normalizeMobilityLandmarkName,
  parseMobilityLandmarkRecords,
} from "../../../src/services/mobility/places/mobility-landmark-import.validation";

const validRecord = {
  name: "Kikúxi Shopping",
  aliases: ["Kikuxi", "KIKÚXI SHOPPING", "  "],
  province: "Luanda",
  municipality: "Viana",
  category: "SHOPPING_CENTRE",
  latitude: -8.91,
  longitude: 13.38,
  source: "OPENSTREETMAP",
  sourceRef: "osm:node/123456789",
  verifiedAt: "2026-11-16T10:00:00Z",
};

assert.equal(normalizeMobilityLandmarkName("Kikúxi Shopping"), "kikuxi shopping");

const [parsed] = parseMobilityLandmarkRecords([validRecord]);
assert.equal(parsed.normalizedName, "kikuxi shopping");
assert.deepEqual(parsed.aliases, ["kikuxi"]);
assert.equal(parsed.countryCode, "AO");
assert.equal(parsed.source, "OPENSTREETMAP");
assert.equal(parsed.latitude, -8.91);
assert.equal(parsed.longitude, 13.38);

const [globalRecord] = parseMobilityLandmarkRecords([{
  ...validRecord,
  name: "Eiffel Tower",
  countryCode: "FR",
  municipality: "Paris",
  latitude: 48.8584,
  longitude: 2.2945,
  sourceRef: "osm:node/123456790",
}]);
assert.equal(globalRecord.countryCode, "FR");
assert.equal(globalRecord.latitude, 48.8584);

assert.throws(
  () => parseMobilityLandmarkRecords([{ ...validRecord, countryCode: "ANG" }]),
  /two-letter ISO 3166-1 alpha-2/,
);

assert.throws(
  () => parseMobilityLandmarkRecords([{ ...validRecord, source: "UNKNOWN" }]),
  /source must be OPENSTREETMAP/,
);

assert.throws(
  () => parseMobilityLandmarkRecords([{ ...validRecord, sourceRef: "http://example.com/place" }]),
  /sourceRef must be an HTTPS URL/,
);

assert.throws(
  () => parseMobilityLandmarkRecords([{ ...validRecord, verifiedAt: "16-11-2026" }]),
  /ISO 8601 timestamp with timezone/,
);

assert.throws(
  () => parseMobilityLandmarkRecords([
    validRecord,
    { ...validRecord, name: "KIKUXI SHOPPING", sourceRef: "osm:node/987654321" },
  ]),
  /Duplicate landmark in import/,
);

assert.throws(
  () => parseMobilityLandmarkRecords([
    validRecord,
    { ...validRecord, name: "Different name", sourceRef: validRecord.sourceRef },
  ]),
  /Duplicate sourceRef in import/,
);

assert.throws(
  () => parseMobilityLandmarkRecords({}),
  /JSON array/,
);

console.log("Mobility landmark import validation tests passed.");
