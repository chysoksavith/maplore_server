-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT;

-- CreateIndex
CREATE INDEX "users_avatar_idx" ON "users"("avatar");
