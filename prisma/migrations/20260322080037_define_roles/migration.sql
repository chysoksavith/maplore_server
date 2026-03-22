-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'BACKEND_USER', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
