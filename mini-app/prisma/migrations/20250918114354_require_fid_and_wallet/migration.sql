/*
  Warnings:

  - Made the column `fid` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "fid" SET NOT NULL,
ALTER COLUMN "fid" SET DATA TYPE BIGINT;
