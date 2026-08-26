-- Provider-agnostic billing customers (Stripe Customer now; Apple/Google later).
-- Does not alter User rows or grant Plus.

CREATE TABLE "BillingCustomer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "SubscriptionProvider" NOT NULL,
  "providerCustomerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCustomer_userId_provider_key"
  ON "BillingCustomer"("userId", "provider");

CREATE UNIQUE INDEX "BillingCustomer_provider_providerCustomerId_key"
  ON "BillingCustomer"("provider", "providerCustomerId");

CREATE INDEX "BillingCustomer_userId_idx" ON "BillingCustomer"("userId");

ALTER TABLE "BillingCustomer"
  ADD CONSTRAINT "BillingCustomer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
