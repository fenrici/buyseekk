-- AlterTable Request: single imageUrl -> imageUrls array
ALTER TABLE "Request" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Request" SET "imageUrls" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL;
ALTER TABLE "Request" DROP COLUMN "imageUrl";

-- AlterTable Offer: single imageUrl -> imageUrls array
ALTER TABLE "Offer" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Offer" SET "imageUrls" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL;
ALTER TABLE "Offer" DROP COLUMN "imageUrl";
