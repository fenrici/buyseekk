-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "zone" TEXT;

-- CreateIndex
CREATE INDEX "Request_category_country_location_zone_idx" ON "Request"("category", "country", "location", "zone");
