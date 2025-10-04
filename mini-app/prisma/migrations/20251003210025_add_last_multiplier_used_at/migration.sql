/*
  Warnings:

  - You are about to drop the column `notificationToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `notificationUrl` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "notificationToken",
DROP COLUMN "notificationUrl",
ADD COLUMN     "lastMultiplierUsedAt" TIMESTAMP(3);
