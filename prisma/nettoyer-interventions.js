import 'dotenv/config';
import prisma from '../src/config/db.js';

// Modèles de contenu réaliste, un par titre de panne connu.
// Utilisés uniquement pour remplacer les entrées suspectes détectées.
const MODELES = {
    'Panne moteur': {
        diagnostic: 'Moteur qui cale par intermittence, surchauffe légère constatée au toucher.',
        causeRacine: 'Roulement moteur usé, générant un frottement excessif.',
        solutionAppliquee: 'Remplacement du roulement et graissage de l\u2019axe moteur.',
        piecesUtilisee: 'Roulement à billes 6205, graisse haute température',
    },
    'Fuite hydraulique': {
        diagnostic: 'Flaque d\u2019huile visible sous le vérin principal, pression en baisse.',
        causeRacine: 'Joint torique du vérin dégradé par l\u2019usure.',
        solutionAppliquee: 'Remplacement du joint torique et purge du circuit hydraulique.',
        piecesUtilisee: 'Joint torique NBR 20x3, huile hydraulique ISO 46',
    },
    'Arrêt automate': {
        diagnostic: 'Automate en défaut, code erreur E204 affiché sur le pupitre.',
        causeRacine: 'Coupure momentanée d\u2019alimentation ayant corrompu le programme en mémoire.',
        solutionAppliquee: 'Redémarrage à froid de l\u2019automate et rechargement du programme depuis la sauvegarde.',
        piecesUtilisee: 'Aucune',
    },
    'Défaut capteur': {
        diagnostic: 'Capteur de position renvoyant une valeur incohérente en continu.',
        causeRacine: 'Connecteur du capteur oxydé, mauvais contact électrique.',
        solutionAppliquee: 'Nettoyage du connecteur et remplacement du capteur par précaution.',
        piecesUtilisee: 'Capteur inductif M12, contacts dorés',
    },
    'Surchauffe': {
        diagnostic: 'Température du carter en nette hausse par rapport à la normale.',
        causeRacine: 'Ventilateur de refroidissement bloqué par de la poussière textile.',
        solutionAppliquee: 'Nettoyage complet du système de ventilation et graissage.',
        piecesUtilisee: 'Aucune',
    },
    'Bruit anormal': {
        diagnostic: 'Bruit métallique répétitif au niveau de l\u2019axe de transmission.',
        causeRacine: 'Désalignement de l\u2019axe suite à un choc mécanique.',
        solutionAppliquee: 'Réalignement de l\u2019axe et resserrage des fixations.',
        piecesUtilisee: 'Aucune',
    },
    'Vibration excessive': {
        diagnostic: 'Vibrations anormales ressenties sur le bâti pendant le fonctionnement.',
        causeRacine: 'Balourd sur l\u2019arbre rotatif dû à une usure inégale.',
        solutionAppliquee: 'Équilibrage de l\u2019arbre rotatif et vérification des fixations.',
        piecesUtilisee: 'Aucune',
    },
    'Défaut électrique': {
        diagnostic: 'Coupure intermittente de l\u2019alimentation du poste.',
        causeRacine: 'Fusible sous-dimensionné déclenchant sous charge normale.',
        solutionAppliquee: 'Remplacement du fusible par un calibre adapté et vérification du câblage.',
        piecesUtilisee: 'Fusible 10A rapide',
    },
    'Blocage mécanique': {
        diagnostic: 'Mécanisme complètement bloqué, aucun mouvement possible.',
        causeRacine: 'Corps étranger (fil textile) coincé dans l\u2019engrenage.',
        solutionAppliquee: 'Démontage partiel, retrait du corps étranger et graissage.',
        piecesUtilisee: 'Graisse mécanique universelle',
    },
    Autre: {
        diagnostic: 'Anomalie constatée lors du contrôle de routine.',
        causeRacine: 'Usure normale liée à l\u2019utilisation intensive de la machine.',
        solutionAppliquee: 'Intervention corrective standard réalisée selon la procédure interne.',
        piecesUtilisee: 'Aucune',
    },
};

// Une intervention est jugée "suspecte" si ses champs se répètent
// ou contiennent visiblement des données de test (email, texte identique partout).
function estSuspecte(intervention) {
    const { diagnostic, causeRacine, solutionAppliquee } = intervention;
    if (diagnostic.includes('@') || causeRacine.includes('@') || solutionAppliquee.includes('@')) return true;
    if (causeRacine === solutionAppliquee) return true;
    if (diagnostic === causeRacine) return true;
    return false;
}

async function main() {
    const interventions = await prisma.intervention.findMany({
        include: { panne: true },
    });

    let corrigees = 0;
    for (const intervention of interventions) {
        if (!estSuspecte(intervention)) continue;

        const modele = MODELES[intervention.panne.titre] || MODELES['Autre'];

        await prisma.intervention.update({
            where: { idIntervention: intervention.idIntervention },
            data: modele,
        });

        console.log(`Intervention #${intervention.idIntervention} (${intervention.panne.titre}) corrigée.`);
        corrigees++;
    }

    console.log(`${corrigees} intervention(s) corrigée(s) sur ${interventions.length}.`);
}

main()
    .catch((err) => console.error(err))
    .finally(() => prisma.$disconnect());