import prisma from '../config/db.js';

// ?projetId=X pour filtrer les lignes d'un seul projet (utile pour un select en cascade)
export async function getLignes(projetId) {
    const where = { actif: true, ...(projetId ? { projetId } : {}) };
    return await prisma.ligne.findMany({
        where,
        include: { projet: true },
        orderBy: { idLigne: 'asc' },
    });
}

export async function getLigneById(id) {
    return await prisma.ligne.findUnique({
        where: { idLigne: id },
        include: { projet: true, machines: true },
    });
}

export async function addLigne(data) {
    return await prisma.ligne.create({ data });
}

export async function updateLigne(id, data) {
    return await prisma.ligne.update({ where: { idLigne: id }, data });
}

export async function desactiverLigne(id) {
    const ligne = await prisma.ligne.findUnique({ where: { idLigne: id } });
    if (!ligne) throw new Error('Ligne introuvable');
    return await prisma.ligne.update({ where: { idLigne: id }, data: { actif: false } });
}