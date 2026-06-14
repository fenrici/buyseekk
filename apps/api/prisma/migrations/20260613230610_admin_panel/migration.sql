-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'SCAM', 'INAPPROPRIATE_CONTENT', 'FAKE_OFFER', 'ABUSIVE_BEHAVIOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_USER_BLOCKED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_USER_UNBLOCKED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_USER_EMAIL_VERIFIED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_OFFER_DELETED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_REQUEST_CLOSED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_REQUEST_REACTIVATED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_REQUEST_DELETED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_MESSAGE_DELETED';
ALTER TYPE "SecurityEvent" ADD VALUE 'ADMIN_REPORT_STATUS_CHANGED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedReason" TEXT;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "requestId" TEXT,
    "offerId" TEXT,
    "chatId" TEXT,
    "messageId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "User_blocked_idx" ON "User"("blocked");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
