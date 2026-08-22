CREATE TABLE "Favourite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favourite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Favourite_userId_productId_key" ON "Favourite"("userId", "productId");
CREATE INDEX "Favourite_userId_createdAt_idx" ON "Favourite"("userId", "createdAt");

ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
