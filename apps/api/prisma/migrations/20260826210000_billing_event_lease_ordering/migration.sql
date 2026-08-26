-- BillingEvent lease for concurrent-safe claim + retry after failure.
-- Subscription.lastProviderEventId for same-timestamp deterministic ordering.

ALTER TABLE "BillingEvent"
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Subscription"
  ADD COLUMN "lastProviderEventId" TEXT;
