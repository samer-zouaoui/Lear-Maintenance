import prisma from '../config/db.js';

// Enregistre une action dans l'audit trail. Volontairement "fire and forget" :
// si l'écriture du log échoue (DB down, etc.), on log juste un warning côté serveur
// mais on ne casse JAMAIS l'action métier principale (créer/modifier une panne...).
export async function logAction({ entite, entiteId, action, details, utilisateurId }) {
    try {
        await prisma.auditLog.create({
            data: {
                entite,
                entiteId,
                action,
                details: details || null,
                utilisateurId: utilisateurId || null,
            },
        });
    } catch (error) {
        console.warn(`[audit] échec de journalisation (${entite} #${entiteId} - ${action}) :`, error.message);
    }
}

export async function getAuditLogs({ entite, entiteId } = {}) {
    return prisma.auditLog.findMany({
        where: {
            ...(entite ? { entite } : {}),
            ...(entiteId ? { entiteId } : {}),
        },
        include: {
            utilisateur: { select: { nomUser: true, role: true } },
        },
        orderBy: { dateAction: 'desc' },
        take: 200,
    });
}