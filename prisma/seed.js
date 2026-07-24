import prisma from '../src/config/db.js';

const PROJETS = [
    { code: 'MBEAM', nom: 'MBEAM' },
    { code: 'NCAR', nom: 'NCAR' },
    { code: 'D-CORSS', nom: 'D-CORSS' },
    { code: 'AYGO', nom: 'AYGO' },
    { code: 'V530', nom: 'V530' },
];

const LIGNES_PAR_PROJET = {
    MBEAM: [],
    NCAR: [],
    'D-CORSS': [],
    AYGO: [],
    V530: [],
};

async function main() {
    for (const p of PROJETS) {
        const projet = await prisma.projet.upsert({
            where: { code: p.code },
            update: {},
            create: p,
        });

        for (const codeLigne of LIGNES_PAR_PROJET[p.code] || []) {
            await prisma.ligne.upsert({
                where: { projetId_code: { projetId: projet.idProjet, code: codeLigne } },
                update: {},
                create: { code: codeLigne, projetId: projet.idProjet },
            });
        }
    }
    console.log('Seed projets/lignes terminé.');
}

main().finally(() => prisma.$disconnect());