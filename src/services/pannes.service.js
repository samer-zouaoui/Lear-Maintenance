import prisma from '../config/db.js';
import * as auditService from './audit.service.js';
import { notifierPanneCritique, notifierPanneAffectee } from './notifications.service.js';

export async function addPanne(panneData, currentUser = null) {
    const machine = await prisma.machine.findUnique({
        where: { idMachine: panneData.machineId },
        include: { ligne: { include: { projet: true } } },
    });
    if (!machine) {
        throw new Error('La machine n\'existe pas');
    }
    if (machine.statutMachine !== 'ACTIF') {
        throw new Error('La machine n\'est pas active');
    }
    if (await prisma.panne.findFirst({ where: { machineId: panneData.machineId, statutPanne: { not: 'RESOLU' } } })) {
        throw new Error('Cette machine a déjà une panne en cours')
    }
    const nouvellePanne = await prisma.panne.create({
        data: panneData
    });
    await prisma.machine.update({
        where: { idMachine: panneData.machineId },
        data: { statutMachine: 'EN_PANNE' }
    })

    auditService.logAction({
        entite: 'Panne',
        entiteId: nouvellePanne.idPanne,
        action: 'CREATE',
        details: `Panne "${nouvellePanne.titre}" (${nouvellePanne.priorite}) déclarée sur la machine ${machine.codeMachine}`,
        utilisateurId: currentUser?.idUser,
    });

    if (nouvellePanne.priorite === 'CRITIQUE') {
        notifierPanneCritique(nouvellePanne, machine);
    }

    return nouvellePanne;
}

export async function updatePanne(id, panneData, currentUser = null) {
    const panneExistante = await prisma.panne.findUnique({
        where: { idPanne: id },
    });

    if (!panneExistante) {
        throw new Error('Panne introuvable');
    }

    if (currentUser?.role === 'TECHNICIEN' && panneExistante.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez modifier que vos pannes affectées');
    }

    if (panneExistante.statutPanne === 'RESOLU') {
        throw new Error('Une panne résolue ne peut plus être modifiée');
    }

    const machineId = panneExistante.machineId;

    if (panneData.technicienId != null && panneData.technicienId !== panneExistante.technicienId) {
        panneData.dateAffectation = new Date();
    }

    const panneMiseAJour = await prisma.$transaction(async (tx) => {
        const updatedPanne = await tx.panne.update({
            where: { idPanne: id },
            data: panneData,
        });

        if (panneData.statutPanne === 'EN_COURS') {
            await tx.machine.update({
                where: { idMachine: machineId },
                data: { statutMachine: 'MAINTENANCE' },
            });
        }

        if (panneData.statutPanne === 'RESOLU') {
            await tx.machine.update({
                where: { idMachine: machineId },
                data: { statutMachine: 'ACTIF' },
            });
        }

        return updatedPanne;
    });

    auditService.logAction({
        entite: 'Panne',
        entiteId: id,
        action: 'UPDATE',
        details: `Champs modifiés : ${Object.keys(panneData).join(', ')}`,
        utilisateurId: currentUser?.idUser,
    });

    const technicienVientDetreAffecte =
        panneData.technicienId != null && panneData.technicienId !== panneExistante.technicienId;

    if (technicienVientDetreAffecte) {
        const machine = await prisma.machine.findUnique({ where: { idMachine: machineId } });
        notifierPanneAffectee(panneMiseAJour, machine, panneData.technicienId);
    }

    return panneMiseAJour;
}

export async function getPannes() {
    return await prisma.panne.findMany({
        include: {
            machine: { include: { ligne: { include: { projet: true } } } },
            technicien: true,
        },
    });
}

export async function getPannesByTechnicienId(technicienId) {
    return await prisma.panne.findMany({
        where: { technicienId },
        include: {
            machine: { include: { ligne: { include: { projet: true } } } },
            technicien: true,
        },
    });
}

export async function getPanneById(id) {
    return await prisma.panne.findUnique({
        where: { idPanne: id },
        include: {
            machine: { include: { ligne: { include: { projet: true } } } },
        },
    });
}

export async function getPanneDetailsById(id, currentUser = null) {
    const panne = await prisma.panne.findUnique({
        where: { idPanne: id },
        include: {
            machine: { include: { ligne: { include: { projet: true } } } },
            technicien: true,
            interventions: {
                include: {
                    technicien: true,
                },
                orderBy: {
                    dateDebut: 'desc',
                },
            },
        },
    });

    if (!panne) {
        return null;
    }

    if (currentUser?.role === 'TECHNICIEN' && panne.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez consulter que vos pannes affectées');
    }

    return panne;
}

export async function deletePanne(id, currentUser = null) {
    const panneExistante = await prisma.panne.findUnique({
        where: { idPanne: id }
    });

    if (!panneExistante) {
        throw new Error('Panne introuvable');
    }

    if (panneExistante.statutPanne === 'RESOLU') {
        throw new Error('Une panne résolue ne peut pas être supprimée');
    }

    const panneSupprimee = await prisma.panne.delete({
        where: { idPanne: id }
    });

    auditService.logAction({
        entite: 'Panne',
        entiteId: id,
        action: 'DELETE',
        details: `Panne "${panneExistante.titre}" supprimée`,
        utilisateurId: currentUser?.idUser,
    });

    return panneSupprimee;
}

export async function setPannePhoto(id, photoUrl, currentUser = null) {
    const panneExistante = await prisma.panne.findUnique({ where: { idPanne: id } });

    if (!panneExistante) {
        throw new Error('Panne introuvable');
    }

    if (currentUser?.role === 'TECHNICIEN' && panneExistante.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez modifier que vos pannes affectées');
    }

    return await prisma.panne.update({
        where: { idPanne: id },
        data: { photoUrl },
    });
}

export async function getPannesByMachineId(machineId) {
    return await prisma.panne.findMany({
        where: { machineId: machineId },
        include: {
            machine: { include: { ligne: { include: { projet: true } } } },
        },
    });
}