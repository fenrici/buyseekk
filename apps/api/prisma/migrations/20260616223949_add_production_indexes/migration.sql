-- DropIndex
DROP INDEX "Message_chatId_idx";

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_sellerId_dismissedBySeller_createdAt_idx" ON "Offer"("sellerId", "dismissedBySeller", "createdAt");

-- CreateIndex
CREATE INDEX "Request_country_active_category_lastBuyerActivityAt_idx" ON "Request"("country", "active", "category", "lastBuyerActivityAt");
