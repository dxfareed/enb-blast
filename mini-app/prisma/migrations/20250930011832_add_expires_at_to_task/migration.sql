-- AlterEnum
ALTER TYPE "public"."TaskType" ADD VALUE 'PARTNER';

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "expiresAt" TIMESTAMP(3);
