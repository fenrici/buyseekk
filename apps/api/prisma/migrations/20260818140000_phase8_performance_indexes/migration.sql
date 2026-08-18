-- SavedSearch.category: acota matching de alertas por categoría de solicitud nueva
CREATE INDEX "SavedSearch_category_idx" ON "SavedSearch"("category");

-- Dedupe atómico por ciclo (lifecycle) o one-shot (offers/matching), vía dedupeKey
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key"
ON "Notification"("userId", "dedupeKey");
