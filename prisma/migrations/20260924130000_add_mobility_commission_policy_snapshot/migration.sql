ALTER TABLE "MobilityRidePayment"
ADD COLUMN "commissionPolicyKey" TEXT;

ALTER TABLE "MobilityRidePayment"
ADD COLUMN "commissionPolicyVersion" INTEGER;

UPDATE "MobilityRidePayment" AS payment
SET
  "commissionPolicyKey" =
    CASE
      WHEN UPPER(REPLACE(COALESCE(ride."serviceType", ''), '-', '_'))
        IN ('MOTO_TAXI', 'MOTOTAXI')
      THEN 'MOBILITY_MOTO_TAXI_STANDARD'
      ELSE 'MOBILITY_TAXI_STANDARD'
    END,
  "commissionPolicyVersion" = 1
FROM "MobilityRide" AS ride
WHERE
  ride."id" = payment."rideId"
  AND (
    payment."commissionPolicyKey" IS NULL
    OR payment."commissionPolicyVersion" IS NULL
  );

UPDATE "MobilityRidePayment"
SET
  "commissionPolicyKey" =
    COALESCE(
      "commissionPolicyKey",
      'MOBILITY_TAXI_STANDARD'
    ),
  "commissionPolicyVersion" =
    COALESCE(
      "commissionPolicyVersion",
      1
    )
WHERE
  "commissionPolicyKey" IS NULL
  OR "commissionPolicyVersion" IS NULL;

ALTER TABLE "MobilityRidePayment"
ALTER COLUMN "commissionPolicyKey" SET NOT NULL;

ALTER TABLE "MobilityRidePayment"
ALTER COLUMN "commissionPolicyVersion" SET NOT NULL;

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_commissionPolicyVersion_check"
CHECK ("commissionPolicyVersion" > 0);

CREATE INDEX "MobilityRidePayment_commissionPolicyKey_idx"
ON "MobilityRidePayment"("commissionPolicyKey");

CREATE INDEX "MobilityRidePayment_commissionPolicyVersion_idx"
ON "MobilityRidePayment"("commissionPolicyVersion");
