/*
  Warnings:

  - The values [BACKEND,FRONTEND] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "public"."users" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "users"
  ALTER COLUMN "type" TYPE "UserType_new"
  USING (
    CASE
      WHEN "type"::text = 'BACKEND' THEN 'ADMIN'::"UserType_new"
      ELSE 'USER'::"UserType_new"
    END
  );
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
ALTER TABLE "users" ALTER COLUMN "type" SET DEFAULT 'USER';
COMMIT;

-- DropIndex
DROP INDEX IF EXISTS "users_avatar_idx";

-- DropIndex
DROP INDEX IF EXISTS "users_otpCode_idx";

-- DropIndex
DROP INDEX IF EXISTS "users_resetPasswordToken_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "bannedReason" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "type" SET DEFAULT 'USER';
