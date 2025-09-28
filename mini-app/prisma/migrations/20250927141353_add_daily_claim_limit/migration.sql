-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "claimsToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastClaimDate" TIMESTAMP(3);
