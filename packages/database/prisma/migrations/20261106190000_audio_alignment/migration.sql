CREATE TYPE "AlignmentStatus" AS ENUM ('QUEUED','PROCESSING','COMPLETED','FAILED','APPLIED','CANCELLED');
CREATE TABLE "AlignmentJob" (
  "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "audioAssetId" TEXT NOT NULL,
  "status" "AlignmentStatus" NOT NULL DEFAULT 'QUEUED', "document" JSONB NOT NULL, "result" JSONB,
  "progress" INTEGER NOT NULL DEFAULT 0, "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT, "heartbeatAt" TIMESTAMP(3), "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("projectId") REFERENCES "VisualProject"("id") ON DELETE CASCADE,
  FOREIGN KEY ("audioAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT
);
CREATE INDEX "AlignmentJob_status_createdAt_idx" ON "AlignmentJob"("status", "createdAt");
CREATE INDEX "AlignmentJob_projectId_createdAt_idx" ON "AlignmentJob"("projectId", "createdAt");
CREATE UNIQUE INDEX "AlignmentJob_one_active_project" ON "AlignmentJob"("projectId") WHERE "status" IN ('QUEUED','PROCESSING');
CREATE TABLE "AlignmentWorker" ("id" TEXT PRIMARY KEY, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
