-- DropIndex
DROP INDEX "public"."GameSession_userId_key";

-- AlterTable
ALTER TABLE "GameSession" DROP COLUMN "isActive",
DROP COLUMN "timeLeft",
DROP COLUMN "updatedAt",
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS';

-- CreateIndex
CREATE INDEX "GameSession_userId_idx" ON "GameSession"("userId");

