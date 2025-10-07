-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verifiedWallets" TEXT[] DEFAULT ARRAY[]::TEXT[];
