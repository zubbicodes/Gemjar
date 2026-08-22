-- Shipment creation/update timestamps required for the fulfilment timeline.
ALTER TABLE "Shipment"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Shipment_orderId_createdAt_idx" ON "Shipment"("orderId", "createdAt");
