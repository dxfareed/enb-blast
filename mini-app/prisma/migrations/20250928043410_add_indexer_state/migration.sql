-- CreateTable
CREATE TABLE "public"."IndexerState" (
    "id" TEXT NOT NULL DEFAULT 'main_indexer',
    "lastProcessedBlock" BIGINT NOT NULL,

    CONSTRAINT "IndexerState_pkey" PRIMARY KEY ("id")
);
