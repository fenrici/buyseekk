-- AlterTable
ALTER TABLE "Request" ADD COLUMN "state" TEXT;

-- Backfill US state from canonical "City, ST" location only
UPDATE "Request"
SET "state" = TRIM(SPLIT_PART("location", ',', 2))
WHERE "country" = 'US'
  AND "location" ~ '^[^,]+, [A-Z]{2}$'
  AND ("state" IS NULL OR "state" = '');

-- CreateIndex
CREATE INDEX "Request_country_state_location_zone_idx" ON "Request"("country", "state", "location", "zone");
