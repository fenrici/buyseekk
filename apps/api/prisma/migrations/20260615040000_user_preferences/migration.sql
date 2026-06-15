-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredMode" "UserMode" NOT NULL DEFAULT 'BUYER';
ALTER TABLE "User" ADD COLUMN "notificationPreferences" JSONB;
