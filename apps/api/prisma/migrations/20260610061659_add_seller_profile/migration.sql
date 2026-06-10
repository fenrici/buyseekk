-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('PERSONAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sellerCategory" "RequestCategory",
ADD COLUMN     "sellerType" "SellerType";
