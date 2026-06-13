-- CreateTable
CREATE TABLE "SavedRequest" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedRequest_sellerId_createdAt_idx" ON "SavedRequest"("sellerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedRequest_sellerId_requestId_key" ON "SavedRequest"("sellerId", "requestId");

-- AddForeignKey
ALTER TABLE "SavedRequest" ADD CONSTRAINT "SavedRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRequest" ADD CONSTRAINT "SavedRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
