-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_USER_UNSUSPENDED';
ALTER TYPE "SecurityEvent" ADD VALUE 'AUTO_REVIEW_TRIGGERED';
ALTER TYPE "SecurityEvent" ADD VALUE 'AUTO_HIDE_REQUEST';
ALTER TYPE "SecurityEvent" ADD VALUE 'AUTO_HIDE_OFFER';
ALTER TYPE "SecurityEvent" ADD VALUE 'AUTO_SUSPEND_USER';
ALTER TYPE "SecurityEvent" ADD VALUE 'AUTO_RESTORE_CONTENT';

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "hiddenByModeration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderationReviewRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "autoTriggeredAction" TEXT,
ADD COLUMN     "reporterIp" TEXT,
ADD COLUMN     "reporterUserAgent" TEXT,
ADD COLUMN     "resolvedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "hiddenByModeration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderationReviewRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- CreateIndex
CREATE INDEX "Report_requestId_idx" ON "Report"("requestId");

-- CreateIndex
CREATE INDEX "Report_offerId_idx" ON "Report"("offerId");

-- CreateIndex
CREATE INDEX "User_suspended_idx" ON "User"("suspended");
