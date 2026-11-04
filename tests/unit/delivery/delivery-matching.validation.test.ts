import { DeliveryMatchingService } from "@/services/delivery/matching/delivery-matching.service";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function assertRejects(
  callback: () => Promise<unknown>,
  expectedMessage: string,
  message: string,
): Promise<void> {
  try {
    await callback();
  } catch (error) {
    assert(
      error instanceof Error && error.message === expectedMessage,
      `${message} (expected ${expectedMessage})`,
    );
    return;
  }

  throw new Error(`Assertion failed: ${message} (expected rejection)`);
}

async function main(): Promise<void> {
  const service = new DeliveryMatchingService();
  const validInput = {
    organizationId: "org_test",
    pickupLatitude: -8.8389,
    pickupLongitude: 13.2894,
  };

  await assertRejects(
    () => service.findCandidates({ ...validInput, organizationId: "   " }),
    "DELIVERY_MATCH_ORGANIZATION_REQUIRED",
    "Organization ID must not be blank",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, pickupLatitude: Number.NaN }),
    "INVALID_DELIVERY_PICKUP_LATITUDE",
    "Latitude must be finite",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, pickupLatitude: 90.01 }),
    "INVALID_DELIVERY_PICKUP_LATITUDE",
    "Latitude must be within geographic bounds",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, pickupLongitude: Number.POSITIVE_INFINITY }),
    "INVALID_DELIVERY_PICKUP_LONGITUDE",
    "Longitude must be finite",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, pickupLongitude: -180.01 }),
    "INVALID_DELIVERY_PICKUP_LONGITUDE",
    "Longitude must be within geographic bounds",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, radiusMeters: 0 }),
    "DELIVERY_MATCH_RADIUS_INVALID",
    "Search radius must be positive",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, radiusMeters: Number.NaN }),
    "DELIVERY_MATCH_RADIUS_INVALID",
    "Search radius must be finite",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, limit: 1.5 }),
    "DELIVERY_MATCH_LIMIT_INVALID",
    "Candidate limit must be an integer",
  );

  await assertRejects(
    () => service.findCandidates({ ...validInput, limit: 0 }),
    "DELIVERY_MATCH_LIMIT_INVALID",
    "Candidate limit must be positive",
  );

  console.log("Delivery matching validation tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
