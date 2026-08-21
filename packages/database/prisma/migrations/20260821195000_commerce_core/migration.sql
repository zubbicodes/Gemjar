-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'DRAFT', 'CONVERTED', 'ABANDONED');

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "catalogueRestricted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "b2bVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "b2cVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "OrganizationProductAccess" (
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationProductAccess_pkey" PRIMARY KEY ("organizationId","productId")
);

-- CreateTable
CREATE TABLE "PricingHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "variantId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationProductAccess_productId_idx" ON "OrganizationProductAccess"("productId");

-- CreateIndex
CREATE INDEX "PricingHistory_organizationId_variantId_createdAt_idx" ON "PricingHistory"("organizationId", "variantId", "createdAt");

-- CreateIndex
CREATE INDEX "Cart_userId_channel_status_updatedAt_idx" ON "Cart"("userId", "channel", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Cart_organizationId_channel_status_updatedAt_idx" ON "Cart"("organizationId", "channel", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Cart_agentId_channel_status_updatedAt_idx" ON "Cart"("agentId", "channel", "status", "updatedAt");

-- AddForeignKey
ALTER TABLE "OrganizationProductAccess" ADD CONSTRAINT "OrganizationProductAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProductAccess" ADD CONSTRAINT "OrganizationProductAccess_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "SalesAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
