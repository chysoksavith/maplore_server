/*
  Warnings:

  - A unique constraint covering the columns `[otpCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_otpCode_key" ON "users"("otpCode");

-- CreateIndex
CREATE INDEX "users_otpCode_idx" ON "users"("otpCode");
