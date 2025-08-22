/*
  Warnings:

  - Added the required column `salt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "salt" TEXT;

-- Generate random salts for existing users
UPDATE "public"."users" 
SET "salt" = md5(random()::text || clock_timestamp()::text)
WHERE "salt" IS NULL;

-- Make salt column NOT NULL after populating it
ALTER TABLE "public"."users" ALTER COLUMN "salt" SET NOT NULL;
