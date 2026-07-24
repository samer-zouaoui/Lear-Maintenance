import prisma from '../config/db.js';


function buildDateFilter(days, offset = 0) {
    if (!days) return undefined;
    const untilDate = offset ? new Date(Date.now() - offset * 24 * 60 * 60 * 1000) : undefined;
    const sinceDate = new Date(Date.now() - (days + offset) * 24 * 60 * 60 * 1000);
    return untilDate ? { gte: sinceDate, lt: untilDate } : { gte: sinceDate };
}

export async function getMTTR(days, offset = 0) {
    const dateFilter = buildDateFilter(days, offset);

    const interventions = await prisma.intervention.findMany({
        where: {
            dateFin: { not: null },
            ...(dateFilter ? { dateDebut: dateFilter } : {}),
        }
    });

    if (interventions.length === 0) {
        return 0;
    }

    const durees = interventions.map((i) => {
        const debut = new Date(i.dateDebut);
        const fin = new Date(i.dateFin);
        return (fin - debut) / (1000 * 60 * 60);
    });

    const sommeDurees = durees.reduce((accumulateur, valeurActuelle) => accumulateur + valeurActuelle, 0);

    return sommeDurees / interventions.length;
}


export async function getTauxDisponibilite() {
    // Indicateur instantané (état actuel du parc machines) : pas de filtre de période applicable.
    const totalMachines = await prisma.machine.count();

    if (totalMachines === 0) {
        return 0;
    }

    const machinesActives = await prisma.machine.count({
        where: {
            statutMachine: 'ACTIF'
        }
    });

    return (machinesActives / totalMachines) * 100;
}


export async function getClassementTechniciens(days) {
    const dateFilter = buildDateFilter(days);

    const resultatsGroupBy = await prisma.intervention.groupBy({
        by: ['technicienId'],
        where: dateFilter ? { dateDebut: dateFilter } : undefined,
        _count: {
            idIntervention: true
        }
    });

    const classementComplet = await Promise.all(
        resultatsGroupBy.map(async (r) => {
            if (!r.technicienId) {
                return {
                    technicienId: null,
                    nomTechnicien: 'Non assigné',
                    nombreInterventions: r._count.idIntervention
                };
            }

            const technicien = await prisma.user.findUnique({
                where: { idUser: r.technicienId },
                select: { nomUser: true } 
            });

            return {
                technicienId: r.technicienId,
                nomTechnicien: technicien?.nomUser || 'Inconnu',
                nombreInterventions: r._count.idIntervention
            };
        })
    );

    return classementComplet.sort((a, b) => b.nombreInterventions - a.nombreInterventions);
}

export async function getMachinesEnArret() {
    // Indicateur instantané : pas de filtre de période applicable.
    return await prisma.machine.count({
        where: {
            statutMachine: {
                not: 'ACTIF'
            }
        }
    });
}

export async function getDowntimeTotal(days, offset = 0) {
    const dateFilter = buildDateFilter(days, offset);

    const interventions = await prisma.intervention.findMany({
        where: {
            dateFin: { not: null },
            ...(dateFilter ? { dateDebut: dateFilter } : {}),
        }
    });

    if (interventions.length === 0) {
        return 0;
    }

    const durees = interventions.map((i) => {
        const debut = new Date(i.dateDebut);
        const fin = new Date(i.dateFin);
        return (fin - debut) / (1000 * 60 * 60);
    });

    return durees.reduce((accumulateur, valeurActuelle) => accumulateur + valeurActuelle, 0);
}


export async function getTopMachines(days) {
    const dateFilter = buildDateFilter(days);

    const resultats = await prisma.panne.groupBy({
        by: ['machineId'],
        where: dateFilter ? { dateCreation: dateFilter } : undefined,
        _count: {
            idPanne: true
        }
    });

    const classementMachines = await Promise.all(
        resultats.map(async (r) => {
            if (!r.machineId) {
                return {
                    machineId: null,
                    nomMachine: 'Machine inconnue',
                    codeMachine: 'N/A',
                    nombrePannes: r._count.idPanne
                };
            }

            const machine = await prisma.machine.findUnique({
                where: { idMachine: r.machineId },
                select: { nomMachine: true, codeMachine: true }
            });

            return {
                machineId: r.machineId,
                nomMachine: machine?.nomMachine || 'Inconnue',
                codeMachine: machine?.codeMachine || 'N/A',
                nombrePannes: r._count.idPanne
            };
        })
    );

    return classementMachines.sort((a, b) => b.nombrePannes - a.nombrePannes);
}

export async function getTopCauses(days) {
    const dateFilter = buildDateFilter(days);

    const resultats = await prisma.panne.groupBy({
        by: ['categorie'],
        where: dateFilter ? { dateCreation: dateFilter } : undefined,
        _count: {
            idPanne: true
        }
    });

    const causesFormatees = resultats.map((r) => ({
        categorie: r.categorie || 'Non spécifiée',
        nombrePannes: r._count.idPanne
    }));

    return causesFormatees.sort((a, b) => b.nombrePannes - a.nombrePannes);
}

export async function getMTBF(days, offset = 0) {
    const dateFilter = buildDateFilter(days, offset);

    const pannes = await prisma.panne.findMany({
        where: dateFilter ? { dateCreation: dateFilter } : undefined,
        orderBy: { dateCreation: 'asc' }
    });

    const parMachine = {};
    for (const panne of pannes) {
        if (!parMachine[panne.machineId]) {
            parMachine[panne.machineId] = [];
        }
        parMachine[panne.machineId].push(panne.dateCreation);
    }

    const ecarts = [];
    for (const machineId in parMachine) {
        const dates = parMachine[machineId];
        for (let i = 1; i < dates.length; i++) {
            const ecartHeures = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60);
            ecarts.push(ecartHeures);
        }
    }

    if (ecarts.length === 0) return 0;
    return ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
}

// Série jour par jour (pannes créées, downtime, MTTR) sur les `days` derniers jours.
// Sert à alimenter les mini sparklines des cartes KPI du dashboard.
export async function getSerieQuotidienne(days) {
    const nbJours = days || 30; // par défaut (période "Tout") on affiche les 30 derniers jours

    const sinceDate = new Date(Date.now() - nbJours * 24 * 60 * 60 * 1000);

    const [pannes, interventions] = await Promise.all([
        prisma.panne.findMany({
            where: { dateCreation: { gte: sinceDate } },
            select: { dateCreation: true }
        }),
        prisma.intervention.findMany({
            where: { dateFin: { not: null }, dateDebut: { gte: sinceDate } },
            select: { dateDebut: true, dateFin: true }
        }),
    ]);

    // On initialise un compartiment par jour, du plus ancien au plus récent.
    const buckets = {};
    for (let i = nbJours - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { date: key, nombrePannes: 0, downtimeHeures: 0, dureesJour: [] };
    }

    for (const p of pannes) {
        const key = new Date(p.dateCreation).toISOString().slice(0, 10);
        if (buckets[key]) buckets[key].nombrePannes += 1;
    }

    for (const i of interventions) {
        const key = new Date(i.dateDebut).toISOString().slice(0, 10);
        if (buckets[key]) {
            const heures = (new Date(i.dateFin) - new Date(i.dateDebut)) / (1000 * 60 * 60);
            buckets[key].downtimeHeures += heures;
            buckets[key].dureesJour.push(heures);
        }
    }

    return Object.values(buckets)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(({ date, nombrePannes, downtimeHeures, dureesJour }) => ({
            date,
            nombrePannes,
            downtimeHeures: Number(downtimeHeures.toFixed(2)),
            mttrJour: dureesJour.length
                ? Number((dureesJour.reduce((a, b) => a + b, 0) / dureesJour.length).toFixed(2))
                : 0,
        }));
}
// État en direct de l'atelier pour l'écran mural (tableau Andon) : toutes les machines actives,
// groupées par ligne, avec la panne en cours le cas échéant (technicien affecté, depuis quand).
// Machine.statutMachine est déjà tenu à jour en temps réel par pannes.service.js/interventions.service.js
// (ACTIF / EN_PANNE / MAINTENANCE), donc pas besoin de recalcul lourd ici.
export async function getEtatAtelier() {
    const machines = await prisma.machine.findMany({
        where: { archivee: false },
        include: { ligne: { include: { projet: true } } },
        orderBy: [{ ligne: { code: 'asc' } }, { zone: 'asc' }, { codeMachine: 'asc' }],
    });

    const machineIdsNonActives = machines.filter((m) => m.statutMachine !== 'ACTIF').map((m) => m.idMachine);

    const pannesActives = machineIdsNonActives.length
        ? await prisma.panne.findMany({
              where: { machineId: { in: machineIdsNonActives }, statutPanne: { not: 'RESOLU' } },
              include: { technicien: true },
              orderBy: { dateCreation: 'desc' },
          })
        : [];

    const panneParMachine = new Map();
    for (const p of pannesActives) {
        if (!panneParMachine.has(p.machineId)) panneParMachine.set(p.machineId, p);
    }

    const lignesMap = new Map();
    for (const m of machines) {
        const panne = panneParMachine.get(m.idMachine);
        const machineEnrichie = {
            idMachine: m.idMachine,
            codeMachine: m.codeMachine,
            nomMachine: m.nomMachine,
            zone: m.zone,
            statutMachine: m.statutMachine,
            criticite: m.criticite,
            panneActive: panne
                ? {
                      titre: panne.titre,
                      statutPanne: panne.statutPanne,
                      dateCreation: panne.dateCreation,
                      technicien: panne.technicien ? { nomUser: panne.technicien.nomUser } : null,
                  }
                : null,
        };

        if (!lignesMap.has(m.ligneId)) {
            lignesMap.set(m.ligneId, {
                ligne: m.ligne.code,
                projet: m.ligne.projet.code,
                machines: [],
            });
        }
        lignesMap.get(m.ligneId).machines.push(machineEnrichie);
    }

    const lignes = Array.from(lignesMap.values());

    const total = machines.length;
    const actives = machines.filter((m) => m.statutMachine === 'ACTIF').length;
    const enPanne = machines.filter((m) => m.statutMachine === 'EN_PANNE').length;
    const enMaintenance = machines.filter((m) => m.statutMachine === 'MAINTENANCE').length;

    const dernierEvenement = await prisma.auditLog.findFirst({
        where: { entite: { in: ['Panne', 'Intervention'] } },
        orderBy: { dateAction: 'desc' },
    });

    return {
        resume: {
            total,
            actives,
            enPanne,
            enMaintenance,
            disponibilite: total > 0 ? Math.round((actives / total) * 100) : 100,
        },
        lignes,
        dernierEvenement: dernierEvenement
            ? { details: dernierEvenement.details, dateAction: dernierEvenement.dateAction }
            : null,
    };
}
