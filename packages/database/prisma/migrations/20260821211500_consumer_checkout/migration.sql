-- Consumer checkout, delivery selection, and payment orchestration.
ALTER TABLE "Order"
ADD COLUMN "confirmationTokenHash" TEXT,
ADD COLUMN "deliveryMethodCode" TEXT,
ADD COLUMN "deliveryMethodName" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "failureCode" TEXT,
ADD COLUMN "failureMessage" TEXT,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Payment" SET "idempotencyKey" = 'legacy-' || "id" WHERE "idempotencyKey" IS NULL;
ALTER TABLE "Payment" ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE TABLE "DeliveryMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "freeThresholdMinor" INTEGER,
    "estimatedDaysMin" INTEGER NOT NULL,
    "estimatedDaysMax" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryMethod_code_key" ON "DeliveryMethod"("code");
CREATE INDEX "DeliveryMethod_active_position_idx" ON "DeliveryMethod"("active", "position");
CREATE UNIQUE INDEX "Order_confirmationTokenHash_key" ON "Order"("confirmationTokenHash");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "OutboxEvent_aggregate_aggregateId_type_key" ON "OutboxEvent"("aggregate", "aggregateId", "type");

ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
