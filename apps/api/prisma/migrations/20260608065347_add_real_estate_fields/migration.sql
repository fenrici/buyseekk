-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "maxSqm" INTEGER,
ADD COLUMN     "minSqm" INTEGER;

-- CreateIndex
CREATE INDEX "Request_category_country_bedrooms_minSqm_maxSqm_idx" ON "Request"("category", "country", "bedrooms", "minSqm", "maxSqm");
