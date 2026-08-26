-- Out-of-order Stripe/provider event protection on Subscription.

ALTER TABLE "Subscription"
  ADD COLUMN "lastProviderEventAt" TIMESTAMP(3);
