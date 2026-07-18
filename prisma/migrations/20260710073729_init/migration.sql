-- CreateEnum
CREATE TYPE "Ligne" AS ENUM ('FSB1', 'FSB2');

-- CreateEnum
CREATE TYPE "StatutMachine" AS ENUM ('MAINTENANCE', 'EN_PANNE', 'ACTIF');

-- CreateEnum
CREATE TYPE "Criticite" AS ENUM ('HAUTE', 'BASSE', 'MOYENNE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RESPONSABLE_MAINTENANCE', 'TECHNICIEN', 'DEMANDEUR');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('CRITIQUE', 'HAUTE', 'MOYENNE', 'BASSE');

-- CreateEnum
CREATE TYPE "StatutPanne" AS ENUM ('RESOLU', 'EN_COURS', 'AFFECTE', 'NOUVEAU');

-- CreateTable
CREATE TABLE "Machine" (
    "idMachine" SERIAL NOT NULL,
    "codeMachine" TEXT NOT NULL,
    "nomMachine" TEXT NOT NULL,
    "ligne" "Ligne" NOT NULL,
    "zone" TEXT NOT NULL,
    "statutMachine" "StatutMachine" NOT NULL,
    "descriptionMachine" TEXT,
    "criticite" "Criticite" NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("idMachine")
);

-- CreateTable
CREATE TABLE "User" (
    "idUser" SERIAL NOT NULL,
    "nomUser" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "Panne" (
    "idPanne" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "priorite" "Priorite" NOT NULL,
    "statutPanne" "StatutPanne" NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categorie" TEXT NOT NULL,
    "machineId" INTEGER NOT NULL,
    "technicienId" INTEGER,

    CONSTRAINT "Panne_pkey" PRIMARY KEY ("idPanne")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "idIntervention" SERIAL NOT NULL,
    "diagnostic" TEXT NOT NULL,
    "causeRacine" TEXT NOT NULL,
    "solutionAppliquee" TEXT NOT NULL,
    "piecesUtilisee" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "panneId" INTEGER NOT NULL,
    "technicienId" INTEGER NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("idIntervention")
);

-- CreateIndex
CREATE UNIQUE INDEX "Machine_codeMachine_key" ON "Machine"("codeMachine");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Panne" ADD CONSTRAINT "Panne_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("idMachine") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panne" ADD CONSTRAINT "Panne_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_panneId_fkey" FOREIGN KEY ("panneId") REFERENCES "Panne"("idPanne") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;
