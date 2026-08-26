-- Provider-agnostic subscriptions + webhook idempotency.
-- Keeps SubscriptionPlan.ENTERPRISE as dormant legacy on User.

CREATE TYPE "SubscriptionProvider" AS ENUM ('STRIPE', 'APPLE', 'GOOGLE');

CREATE TYPE "SubscriptionStatus" AS ENUM (
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'INCOMPLETE',
  'EXPIRED'
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "SubscriptionProvider" NOT NULL,
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT NOT NULL,
  "providerPriceId" TEXT,
  "status" "SubscriptionStatus" NOT NULL,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL,
  "provider" "SubscriptionProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_provider_providerSubscriptionId_key"
  ON "Subscription"("provider", "providerSubscriptionId");

CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

CREATE INDEX "Subscription_provider_providerCustomerId_idx"
  ON "Subscription"("provider", "providerCustomerId");

CREATE UNIQUE INDEX "BillingEvent_provider_providerEventId_key"
  ON "BillingEvent"("provider", "providerEventId");

CREATE INDEX "BillingEvent_provider_createdAt_idx"
  ON "BillingEvent"("provider", "createdAt");

CREATE INDEX "User_subscriptionPlan_idx" ON "User"("subscriptionPlan");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
