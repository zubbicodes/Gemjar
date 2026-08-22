ALTER TABLE "ImportJob" ADD COLUMN "payload" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "objectKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- Rollback (safe before clients depend on export history):
-- DROP TABLE "ExportJob";
-- ALTER TABLE "ImportJob" DROP COLUMN "payload";
