CREATE TABLE "Projet" (
    "idProjet" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "Projet_code_key" UNIQUE ("code")
);

CREATE TABLE "Ligne_tmp" (
    "idLigne" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "projetId" INTEGER NOT NULL,
    CONSTRAINT "Ligne_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("idProjet"),
    CONSTRAINT "Ligne_projetId_code_key" UNIQUE ("projetId", "code")
);

INSERT INTO "Projet" ("code", "nom") VALUES ('A_CLASSER', 'À classer');

INSERT INTO "Ligne_tmp" ("code", "projetId")
SELECT DISTINCT "ligne"::text, (SELECT "idProjet" FROM "Projet" WHERE "code" = 'A_CLASSER')
FROM "Machine";

ALTER TABLE "Machine" ADD COLUMN "ligneId" INTEGER;

UPDATE "Machine" m
SET "ligneId" = l."idLigne"
FROM "Ligne_tmp" l
WHERE l."code" = m."ligne"::text
  AND l."projetId" = (SELECT "idProjet" FROM "Projet" WHERE "code" = 'A_CLASSER');

ALTER TABLE "Machine" ALTER COLUMN "ligneId" SET NOT NULL;
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_ligneId_fkey"
    FOREIGN KEY ("ligneId") REFERENCES "Ligne_tmp"("idLigne");

ALTER TABLE "Machine" DROP COLUMN "ligne";
DROP TYPE "Ligne";

ALTER TABLE "Ligne_tmp" RENAME TO "Ligne";  