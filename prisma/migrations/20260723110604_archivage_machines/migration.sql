-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Ligne" ADD VALUE 'FSC1';
ALTER TYPE "Ligne" ADD VALUE 'FSC2';
ALTER TYPE "Ligne" ADD VALUE 'RSB1';
ALTER TYPE "Ligne" ADD VALUE 'RSB2';
ALTER TYPE "Ligne" ADD VALUE 'RSC1';
ALTER TYPE "Ligne" ADD VALUE 'RSC2';
ALTER TYPE "Ligne" ADD VALUE 'skte';
