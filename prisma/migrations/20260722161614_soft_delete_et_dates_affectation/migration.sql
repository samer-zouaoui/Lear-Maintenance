-- DropForeignKey
ALTER TABLE "HistoriqueMaintenance" DROP CONSTRAINT "HistoriqueMaintenance_technicienId_fkey";

-- DropForeignKey
ALTER TABLE "Intervention" DROP CONSTRAINT "Intervention_technicienId_fkey";

-- AlterTable
ALTER TABLE "HistoriqueMaintenance" ALTER COLUMN "technicienId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Intervention" ALTER COLUMN "technicienId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Panne" ADD COLUMN     "dateAffectation" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlanPreventif" ADD COLUMN     "dateAffectation" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueMaintenance" ADD CONSTRAINT "HistoriqueMaintenance_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
