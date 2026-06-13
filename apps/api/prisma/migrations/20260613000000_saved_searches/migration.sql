-- AlterTable: últimos filtros usados por el vendedor
ALTER TABLE "User" ADD COLUMN "lastSellerFilters" JSONB;

-- CreateTable: búsquedas guardadas del vendedor
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RequestCategory",
    "filters" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedSearch_userId_name_key" ON "SavedSearch"("userId", "name");
CREATE INDEX "SavedSearch_userId_isDefault_idx" ON "SavedSearch"("userId", "isDefault");

ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
