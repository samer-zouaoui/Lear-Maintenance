import prisma from '../config/db.js';

export async function getProjets(filtre = 'actifs') {
    const where = filtre === 'inactifs' ? { actif: false } : filtre === 'tous' ? {} : { actif: true };
    return await prisma.projet.findMany({
        where,
        include: { lignes: true },
        orderBy: { idProjet: 'asc' },
    });
}

export async function getProjetById(id) {
    return await prisma.projet.findUnique({
        where: { idProjet: id },
        include: { lignes: true },
    });
}

export async function addProjet(data) {
    return await prisma.projet.create({ data });
}

export async function updateProjet(id, data) {
    return await prisma.projet.update({ where: { idProjet: id }, data });
}

export async function desactiverProjet(id) {
    const projet = await prisma.projet.findUnique({ where: { idProjet: id } });
    if (!projet) throw new Error('Projet introuvable');
    return await prisma.projet.update({ where: { idProjet: id }, data: { actif: false } });
}

export async function reactiverProjet(id) {
    const projet = await prisma.projet.findUnique({ where: { idProjet: id } });
    if (!projet) throw new Error('Projet introuvable');
    return await prisma.projet.update({ where: { idProjet: id }, data: { actif: true } });
}