import prisma from '../config/db.js';

function validateDates(dateDebut, dateFin) {
    if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
        throw new Error('La date de fin ne peut pas être antérieure à la date de début');
    }
}

export async function addIntervention(interventionData, currentUser = null) {
    validateDates(interventionData.dateDebut, interventionData.dateFin);

    const allowedRoles = ['TECHNICIEN', 'ADMIN', 'RESPONSABLE_MAINTENANCE'];
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
        throw new Error('Accès interdit');
    }

    const panne = await prisma.panne.findUnique({
        where: { idPanne: interventionData.panneId },
    });

    if (!panne) {
        throw new Error('Panne introuvable');
    }

    if (currentUser?.role === 'TECHNICIEN') {
        if (panne.technicienId !== currentUser.idUser) {
            throw new Error('Vous ne pouvez créer une intervention que pour vos pannes affectées');
        }

        if (!['AFFECTE', 'EN_COURS'].includes(panne.statutPanne)) {
            throw new Error('Cette panne n\'est pas disponible pour une intervention');
        }
    }

    if (['ADMIN', 'RESPONSABLE_MAINTENANCE'].includes(currentUser.role) && !['AFFECTE', 'EN_COURS'].includes(panne.statutPanne)) {
        throw new Error('Cette panne n\'est pas disponible pour une intervention');
    }

    return await prisma.$transaction(async (tx) => {
        const nouvelleIntervention = await tx.intervention.create({
            data: {
                ...interventionData,
                technicienId: currentUser.idUser,
            },
        });

        if (['ADMIN', 'RESPONSABLE_MAINTENANCE'].includes(currentUser.role)) {
            await tx.panne.update({
                where: { idPanne: interventionData.panneId },
                data: { statutPanne: 'RESOLU' },
            });

            await tx.machine.update({
                where: { idMachine: panne.machineId },
                data: { statutMachine: 'ACTIF' },
            });
        }

        return nouvelleIntervention;
    });
}

export async function cloturerPanneAvecIntervention(panneId, interventionData, currentUser = null) {
    validateDates(interventionData.dateDebut, interventionData.dateFin);

    const panne = await prisma.panne.findUnique({
        where: { idPanne: panneId },
    });

    if (!panne) {
        throw new Error('Panne introuvable');
    }

    if (currentUser?.role === 'TECHNICIEN' && panne.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez clôturer que vos pannes affectées');
    }

    if (panne.statutPanne !== 'EN_COURS') {
        throw new Error('La panne doit être en cours pour être clôturée');
    }

    return await prisma.$transaction(async (tx) => {
        const intervention = await tx.intervention.create({
            data: {
                ...interventionData,
                panneId,
                technicienId: currentUser?.idUser ?? interventionData.technicienId,
            },
        });

        await tx.panne.update({
            where: { idPanne: panneId },
            data: { statutPanne: 'RESOLU' },
        });

        await tx.machine.update({
            where: { idMachine: panne.machineId },
            data: { statutMachine: 'ACTIF' },
        });

        return intervention;
    });
}

export async function getInterventions() {
    return await prisma.intervention.findMany();
}

export async function getInterventionsByTechnicienId(technicienId) {
    return await prisma.intervention.findMany({
        where: { technicienId },
    });
}

export async function getInterventionById(id, currentUser = null) {
    const intervention = await prisma.intervention.findUnique({
        where: { idIntervention: id }
    });

    if (!intervention) {
        return null;
    }

    if (currentUser?.role === 'TECHNICIEN' && intervention.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez consulter que vos interventions');
    }

    return intervention;
}

export async function updateIntervention(id, interventionData, currentUser = null) {
    const interventionExistante = await prisma.intervention.findUnique({
        where: { idIntervention: id }
    });

    if (!interventionExistante) {
        throw new Error('Intervention introuvable');
    }

    if (currentUser?.role === 'TECHNICIEN' && interventionExistante.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez modifier que vos interventions');
    }

    const dateDebut = interventionData.dateDebut ?? interventionExistante.dateDebut;
    const dateFin = interventionData.dateFin ?? interventionExistante.dateFin;
    validateDates(dateDebut, dateFin);

    return await prisma.intervention.update({
        where: { idIntervention: id },
        data: interventionData
    });
}

export async function deleteIntervention(id, currentUser = null) {
    const interventionExistante = await prisma.intervention.findUnique({
        where: { idIntervention: id }
    });

    if (!interventionExistante) {
        throw new Error('Intervention introuvable');
    }

    if (currentUser?.role === 'TECHNICIEN' && interventionExistante.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez supprimer que vos interventions');
    }

    return await prisma.intervention.delete({
        where: { idIntervention: id }
    });
}


export async function getInterventionsByPanneId(panneId, currentUser = null) {
    if (currentUser?.role === 'TECHNICIEN') {
        const panne = await prisma.panne.findUnique({
            where: { idPanne: panneId },
        });

        if (!panne) {
            throw new Error('Panne introuvable');
        }

        if (panne.technicienId !== currentUser.idUser) {
            throw new Error('Vous ne pouvez consulter que vos pannes affectées');
        }
    }

    return await prisma.intervention.findMany({
        where: { panneId: panneId }
    });
}

export async function calculerDuree(intervention) {
    if (!intervention.dateFin) {
        return null;   
    }
    const dateDebut = new Date(intervention.dateDebut);
    const dateFin = new Date(intervention.dateFin);
    const dureeHeures = (dateFin - dateDebut) / (1000 * 60 * 60);
    return dureeHeures;
}