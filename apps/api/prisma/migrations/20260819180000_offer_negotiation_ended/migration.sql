-- CreateEnum
CREATE TYPE "NegotiationEndedBy" AS ENUM ('BUYER', 'SELLER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEGOTIATION_ENDED';

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "negotiationEndedAt" TIMESTAMP(3),
ADD COLUMN "negotiationEndedBy" "NegotiationEndedBy";

-- CreateIndex
CREATE INDEX "Offer_requestId_status_dealCompletedAt_negotiationEndedAt_idx" ON "Offer"("requestId", "status", "dealCompletedAt", "negotiationEndedAt");
