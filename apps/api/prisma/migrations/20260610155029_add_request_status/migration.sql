-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('ACTIVA', 'NEGOCIANDO', 'CERRADA');

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'ACTIVA';

-- CreateIndex
CREATE INDEX "Request_country_active_lastActivityAt_idx" ON "Request"("country", "active", "lastActivityAt");

-- Backfill: solicitudes con oferta aceptada pasan a NEGOCIANDO
UPDATE "Request" r
SET "status" = 'NEGOCIANDO'
WHERE EXISTS (
  SELECT 1 FROM "Offer" o WHERE o."requestId" = r.id AND o."status" = 'ACEPTADA'
);

-- Backfill: lastActivityAt = actividad real más reciente (creación, oferta o mensaje)
UPDATE "Request" r
SET "lastActivityAt" = GREATEST(
  r."createdAt",
  COALESCE((SELECT MAX(o."createdAt") FROM "Offer" o WHERE o."requestId" = r.id), r."createdAt"),
  COALESCE((
    SELECT MAX(m."createdAt")
    FROM "Message" m
    JOIN "Chat" c ON c.id = m."chatId"
    JOIN "Offer" o ON o.id = c."offerId"
    WHERE o."requestId" = r.id
  ), r."createdAt")
);
