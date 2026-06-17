-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultAcceptMessage" TEXT;

-- CreateTable
CREATE TABLE "ChatReadState" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatReadState_userId_idx" ON "ChatReadState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReadState_chatId_userId_key" ON "ChatReadState"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "ChatReadState" ADD CONSTRAINT "ChatReadState_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadState" ADD CONSTRAINT "ChatReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
