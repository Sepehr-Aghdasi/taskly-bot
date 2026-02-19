-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

UPDATE "UserSettings"
SET "language" = 'fa';
