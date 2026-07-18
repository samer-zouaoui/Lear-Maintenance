-- AlterTable
ALTER TABLE "Panne" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "idAuditLog" SERIAL NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "dateAction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateurId" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("idAuditLog")
);

-- CreateTable
CREATE TABLE "Notification" (
    "idNotification" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destinataireId" INTEGER NOT NULL,
    "panneId" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("idNotification")
);

-- CreateIndex
CREATE INDEX "AuditLog_entite_entiteId_idx" ON "AuditLog"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "AuditLog_dateAction_idx" ON "AuditLog"("dateAction");

-- CreateIndex
CREATE INDEX "Notification_destinataireId_lu_idx" ON "Notification"("destinataireId", "lu");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_panneId_fkey" FOREIGN KEY ("panneId") REFERENCES "Panne"("idPanne") ON DELETE CASCADE ON UPDATE CASCADE;
