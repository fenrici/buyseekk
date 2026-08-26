-- Hosted Checkout attempt ledger (reuse OPEN sessions; Phase 3 marks COMPLETE/EXPIRED).
-- Partial unique: at most one OPEN checkout per user+provider+plan.

CREATE TYPE "BillingCheckoutStatus" AS ENUM ('OPEN', 'COMPLETE', 'EXPIRED', 'CANCELED');

CREATE TABLE "BillingCheckoutSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "SubscriptionProvider" NOT NULL,
  "plan" TEXT NOT NULL,
  "providerSessionId" TEXT,
  "checkoutUrl" TEXT,
  "status" "BillingCheckoutStatus" NOT NULL DEFAULT 'OPEN',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BillingCheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCheckoutSession_provider_providerSessionId_key"
  ON "BillingCheckoutSession"("provider", "providerSessionId");

CREATE INDEX "BillingCheckoutSession_userId_provider_plan_status_idx"
  ON "BillingCheckoutSession"("userId", "provider", "plan", "status");

CREATE INDEX "BillingCheckoutSession_userId_status_expiresAt_idx"
  ON "BillingCheckoutSession"("userId", "status", "expiresAt");

CREATE UNIQUE INDEX "BillingCheckoutSession_open_user_provider_plan_key"
  ON "BillingCheckoutSession"("userId", "provider", "plan")
  WHERE "status" = 'OPEN';

ALTER TABLE "BillingCheckoutSession"
  ADD CONSTRAINT "BillingCheckoutSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
