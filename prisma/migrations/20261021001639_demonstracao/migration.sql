-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "demoResetAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;
