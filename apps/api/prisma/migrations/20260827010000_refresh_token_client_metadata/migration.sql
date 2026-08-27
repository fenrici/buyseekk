-- Additive metadata for refresh sessions (web + native clients).
CREATE TYPE "RefreshClientType" AS ENUM ('WEB', 'IOS', 'ANDROID');

ALTER TABLE "RefreshToken"
  ADD COLUMN "clientType" "RefreshClientType" NOT NULL DEFAULT 'WEB',
  ADD COLUMN "deviceId" TEXT,
  ADD COLUMN "deviceLabel" TEXT,
  ADD COLUMN "lastUsedAt" TIMESTAMP(3);
