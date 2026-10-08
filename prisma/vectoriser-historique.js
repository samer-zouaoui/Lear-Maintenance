import prisma from '../src/config/db.js';
import qdrant, { COLLECTION_INTERVENTIONS, assurerCollection } from '../src/config/qdrant.js';
import { genererEmbedding } from '../src/services/embeddings.service.js';

async function main() {
    await assurerCollection();

    const interventions = await prisma.intervention.findMany({
        where: { dateFin: { not: null } },
        include: { panne: { include: { machine: { include: { ligne: { include: { projet: true } } } } } } },
    });

    console.log(`${interventions.length} interventions à vectoriser...`);

    let compteur = 0;
    for (const intervention of interventions) {
        const panne = intervention.panne;
        // On combine les infos pertinentes en un seul texte : c'est CE texte qui sera comparé
        // à la nouvelle panne au moment de la recherche par similarité.
        const texte = [
            `Titre: ${panne.titre}`,
            `Catégorie: ${panne.categorie}`,
            `Diagnostic: ${intervention.diagnostic}`,
            `Cause racine: ${intervention.causeRacine}`,
            `Solution appliquée: ${intervention.solutionAppliquee}`,
        ].join('\n');

        const vecteur = await genererEmbedding(texte);

        await qdrant.upsert(COLLECTION_INTERVENTIONS, {
            points: [{
                id: intervention.idIntervention,
                vector: vecteur,
                payload: {
                    panneId: panne.idPanne,
                    titre: panne.titre,
                    categorie: panne.categorie,
                    machineCode: panne.machine.codeMachine,
                    projetCode: panne.machine.ligne.projet.code,
                    diagnostic: intervention.diagnostic,
                    causeRacine: intervention.causeRacine,
                    solutionAppliquee: intervention.solutionAppliquee,
                    piecesUtilisee: intervention.piecesUtilisee,
                },
            }],
        });

        compteur++;
        console.log(`  [${compteur}/${interventions.length}] Intervention #${intervention.idIntervention} vectorisée`);
    }

    console.log('Vectorisation terminée.');
}

main()
    .catch((err) => console.error(err))
    .finally(() => prisma.$disconnect());