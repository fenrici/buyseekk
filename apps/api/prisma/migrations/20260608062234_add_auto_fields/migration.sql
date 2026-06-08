-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "carBrand" TEXT,
ADD COLUMN     "carColor" TEXT,
ADD COLUMN     "carModel" TEXT,
ADD COLUMN     "maxMileage" INTEGER;

-- CreateIndex
CREATE INDEX "Request_category_country_carBrand_carModel_idx" ON "Request"("category", "country", "carBrand", "carModel");
