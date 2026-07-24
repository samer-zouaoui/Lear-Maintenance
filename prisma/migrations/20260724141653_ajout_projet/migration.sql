-- DropForeignKey
ALTER TABLE "Ligne" DROP CONSTRAINT "Ligne_projetId_fkey";

-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_ligneId_fkey";

-- AlterTable
ALTER TABLE "Ligne" RENAME CONSTRAINT "Ligne_tmp_pkey" TO "Ligne_pkey";

-- AlterTable
ALTER TABLE "Projet" ALTER COLUMN "dateCreation" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Ligne" ADD CONSTRAINT "Ligne_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("idProjet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne"("idLigne") ON DELETE RESTRICT ON UPDATE CASCADE;
