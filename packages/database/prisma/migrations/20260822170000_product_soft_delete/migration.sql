ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- Rollback: DROP INDEX "Product_deletedAt_idx"; ALTER TABLE "Product" DROP COLUMN "deletedAt"; deleted products become permanently indistinguishable from active ones.
