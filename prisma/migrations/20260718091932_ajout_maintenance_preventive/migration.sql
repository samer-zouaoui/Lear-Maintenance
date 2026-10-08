-- CreateEnum
CREATE TYPE "FrequenceMaintenance" AS ENUM ('QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE');

-- CreateEnum
CREATE TYPE "StatutPlanPreventif" AS ENUM ('ACTIF', 'INACTIF');

-- CreateTable
CREATE TABLE "PlanPreventif" (
    "idPlan" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "frequence" "FrequenceMaintenance" NOT NULL,
    "intervalleJours" INTEGER NOT NULL,
    "dateDerniereRealisation" TIMESTAMP(3),
    "dateProchaine" TIMESTAMP(3) NOT NULL,
    "statut" "StatutPlanPreventif" NOT NULL DEFAULT 'ACTIF',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "machineId" INTEGER NOT NULL,
    "technicienId" INTEGER,

    CONSTRAINT "PlanPreventif_pkey" PRIMARY KEY ("idPlan")
);

-- CreateTable
CREATE TABLE "HistoriqueMaintenance" (
    "idHistorique" SERIAL NOT NULL,
    "dateRealisation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarque" TEXT,
    "planId" INTEGER NOT NULL,
    "technicienId" INTEGER NOT NULL,

    CONSTRAINT "HistoriqueMaintenance_pkey" PRIMARY KEY ("idHistorique")
);

-- CreateIndex
CREATE INDEX "PlanPreventif_dateProchaine_statut_idx" ON "PlanPreventif"("dateProchaine", "statut");

-- AddForeignKey
ALTER TABLE "PlanPreventif" ADD CONSTRAINT "PlanPreventif_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("idMachine") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPreventif" ADD CONSTRAINT "PlanPreventif_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueMaintenance" ADD CONSTRAINT "HistoriqueMaintenance_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanPreventif"("idPlan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueMaintenance" ADD CONSTRAINT "HistoriqueMaintenance_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;
