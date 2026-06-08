-- CreateEnum
CREATE TYPE "RatingType" AS ENUM ('REVIEW', 'NO_RESPONSE');

-- Clear legacy ratings without offerId (none expected in dev)
DELETE FROM "Rating" WHERE "offerId" IS NULL;

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN "type" "RatingType" NOT NULL DEFAULT 'REVIEW';
ALTER TABLE "Rating" ALTER COLUMN "stars" DROP NOT NULL;
ALTER TABLE "Rating" ALTER COLUMN "offerId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Rating_fromUserId_offerId_key" ON "Rating"("fromUserId", "offerId");
CREATE INDEX "Rating_toUserId_type_idx" ON "Rating"("toUserId", "type");
