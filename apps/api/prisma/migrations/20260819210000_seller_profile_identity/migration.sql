-- Rename seller types
ALTER TYPE "SellerType" RENAME VALUE 'PERSONAL' TO 'INDIVIDUAL';
ALTER TYPE "SellerType" RENAME VALUE 'BUSINESS' TO 'COMPANY';

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('DEALERSHIP', 'REAL_ESTATE_AGENCY', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "businessType" "BusinessType",
ADD COLUMN "state" TEXT;

-- Backfill US state and normalize city when stored as canonical "Area, ST"
UPDATE "User"
SET
  "state" = TRIM(SPLIT_PART("city", ',', 2)),
  "city" = TRIM(SPLIT_PART("city", ',', 1))
WHERE "country" = 'US'
  AND "city" ~ '^[^,]+, [A-Z]{2}$'
  AND ("state" IS NULL OR "state" = '');
