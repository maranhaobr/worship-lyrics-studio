CREATE TABLE "VisualProject" (
  "id" TEXT NOT NULL, "songId" TEXT, "name" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1, "document" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VisualProject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VisualProject_songId_updatedAt_idx" ON "VisualProject"("songId", "updatedAt");
ALTER TABLE "VisualProject" ADD CONSTRAINT "VisualProject_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "VisualTemplate" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "style" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VisualTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "durationMs" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
