-- AlterTable
ALTER TABLE "Request" ADD COLUMN "lastBuyerActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Request" ADD COLUMN "pausedAt" TIMESTAMP(3);

-- Backfill actividad del comprador desde lastActivityAt
UPDATE "Request" SET "lastBuyerActivityAt" = "lastActivityAt";

-- Reindex para listados de vendedores
DROP INDEX IF EXISTS "Request_country_active_lastActivityAt_idx";
CREATE INDEX "Request_country_active_lastBuyerActivityAt_idx" ON "Request"("country", "active", "lastBuyerActivityAt");
