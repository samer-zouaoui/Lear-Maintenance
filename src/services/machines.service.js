import prisma from '../config/db.js';

export async function addMachine(machineData) {
    const nouvelleMachine = await prisma.machine.create({
        data: machineData
    });
    return nouvelleMachine;
}

// filtre : 'actives' (défaut, parc en service) | 'archivees' | 'toutes'
export async function getMachines(filtre = 'actives') {
    const where = filtre === 'archivees' ? { archivee: true } : filtre === 'toutes' ? {} : { archivee: false };
    return await prisma.machine.findMany({
        where,
        include: { ligne: { include: { projet: true } } },
        orderBy: { idMachine: 'asc' },
    });
}

export async function getMachineById(id) {
    return await prisma.machine.findUnique({
        where: { idMachine: id },
        include: { ligne: { include: { projet: true } } },
    });
}

export async function updateMachine(id, machineData) {
    return await prisma.machine.update({
        where: { idMachine: id },
        data: machineData
    });
}

// "Supprimer" une machine = l'archiver (soft delete). On ne supprime jamais réellement la ligne,
// pour ne jamais perdre l'historique des pannes/interventions/maintenances qui la concernent,
// et pour éviter tout crash de contrainte de clé étrangère.
export async function archiveMachine(id) {
    const machine = await prisma.machine.findUnique({ where: { idMachine: id } });
    if (!machine) {
        throw new Error('Machine introuvable');
    }
    return await prisma.machine.update({
        where: { idMachine: id },
        data: { archivee: true },
    });
}

export async function reactivateMachine(id) {
    const machine = await prisma.machine.findUnique({ where: { idMachine: id } });
    if (!machine) {
        throw new Error('Machine introuvable');
    }
    return await prisma.machine.update({
        where: { idMachine: id },
        data: { archivee: false },
    });
}