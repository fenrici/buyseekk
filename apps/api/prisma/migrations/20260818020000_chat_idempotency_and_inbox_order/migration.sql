-- Inbox: denormalized last activity so list can ORDER BY without loading messages.
ALTER TABLE "Chat" ADD COLUMN "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Chat" AS c
SET "lastMessageAt" = COALESCE(
  (SELECT MAX(m."createdAt") FROM "Message" m WHERE m."chatId" = c."id"),
  c."createdAt"
);

CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt");

-- Idempotent sends: same chat + sender role + clientMessageId → one row.
ALTER TABLE "Message" ADD COLUMN "clientMessageId" TEXT;

CREATE UNIQUE INDEX "Message_chat_role_client_key" ON "Message"("chatId", "fromRole", "clientMessageId");
