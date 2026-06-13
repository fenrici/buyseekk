-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_OFFER', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'NEW_MESSAGE', 'REQUEST_EXPIRING', 'REQUEST_INACTIVE', 'REQUEST_CLOSED', 'EMAIL_VERIFIED');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('REQUEST', 'OFFER', 'CHAT', 'USER');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" "NotificationEntityType",
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_type_entityId_idx" ON "Notification"("userId", "type", "entityId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
