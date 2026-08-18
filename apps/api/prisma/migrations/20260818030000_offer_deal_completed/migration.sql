-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_COMPLETED';

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "dealCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Offer_requestId_dealCompletedAt_idx" ON "Offer"("requestId", "dealCompletedAt");

-- At most one completed deal per request (partial unique index)
CREATE UNIQUE INDEX "Offer_requestId_completed_unique" ON "Offer"("requestId") WHERE "dealCompletedAt" IS NOT NULL;
