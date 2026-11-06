-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('INTRO', 'VERSE', 'PRE_CHORUS', 'CHORUS', 'BRIDGE', 'OUTRO', 'CUSTOM');

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "key" TEXT,
    "bpm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongSection" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SongSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LyricLine" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startMs" INTEGER,
    "endMs" INTEGER,

    CONSTRAINT "LyricLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Song_title_idx" ON "Song"("title");

-- CreateIndex
CREATE UNIQUE INDEX "SongSection_songId_order_key" ON "SongSection"("songId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LyricLine_sectionId_order_key" ON "LyricLine"("sectionId", "order");

-- AddForeignKey
ALTER TABLE "SongSection" ADD CONSTRAINT "SongSection_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricLine" ADD CONSTRAINT "LyricLine_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SongSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
