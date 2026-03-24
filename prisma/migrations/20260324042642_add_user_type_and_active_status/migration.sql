-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('BACKEND', 'FRONTEND');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'FRONTEND';

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_type_idx" ON "users"("type");
