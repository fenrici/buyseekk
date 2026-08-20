-- Separate buyer/seller avatars and tag notifications with the target mode.

ALTER TABLE "User" ADD COLUMN "buyerAvatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "sellerAvatarUrl" TEXT;

UPDATE "User" SET "buyerAvatarUrl" = "avatarUrl" WHERE "avatarUrl" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "avatarUrl";

ALTER TABLE "Notification" ADD COLUMN "targetMode" "UserMode" NOT NULL DEFAULT 'BUYER';

UPDATE "Notification"
SET "targetMode" = 'SELLER'
WHERE "type" IN (
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'DEAL_COMPLETED',
  'NEW_MATCHING_REQUEST'
);
