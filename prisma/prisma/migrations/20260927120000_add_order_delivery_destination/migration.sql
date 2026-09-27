-- Add physical delivery destination to commerce orders.
ALTER TABLE "Order"
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "deliveryLatitude" DECIMAL(10,7),
  ADD COLUMN "deliveryLongitude" DECIMAL(10,7),
  ADD COLUMN "deliveryInstructions" TEXT;
