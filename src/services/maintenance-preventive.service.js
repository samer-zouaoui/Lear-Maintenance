import prisma from '../config/db.js';
import * as auditService from './audit.service.js';
import { notifierMaintenancePreventiveDue, notifierMaintenancePreventiveAffectee } from './notifications.service.js';

// Valeur par défaut de l'intervalle (en jours) associée à chaque fréquence,
// utilisée si le client ne fournit pas explicitement `intervalleJours`.
const INTERVALLE_PAR_FREQUENCE = {
    QUOTIDIENNE: 1,
    HEBDOMADAIRE: 7,
    MENSUELLE: 30,
    TRIMESTRIELLE: 90,
    ANNUELLE: 365,
};

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export async function createPlan(data, currentUser = null) {
    const machine = await prisma.machine.findUnique({ where: { idMachine: data.machineId } });
    if (!machine) {
        throw new Error("La machine n'existe pas");
    }

    if (data.technicienId) {
        const technicien = await prisma.user.findUnique({ where: { idUser: data.technicienId } });
        if (!technicien || technicien.role !== 'TECHNICIEN') {
            throw new Error("Le technicien assigné est invalide");
        }
    }

    const intervalleJours = data.intervalleJours || INTERVALLE_PAR_FREQUENCE[data.frequence] || 30;
    const dateProchaine = addDays(new Date(), intervalleJours);

    const plan = await prisma.planPreventif.create({
        data: {
            titre: data.titre,
            description: data.description || null,
            frequence: data.frequence,
            intervalleJours,
            machineId: data.machineId,
            technicienId: data.technicienId || null,
            dateAffectation: data.technicienId ? new Date() : null,
            dateProchaine,
        },
    });

    auditService.logAction({
        entite: 'PlanPreventif',
        entiteId: plan.idPlan,
        action: 'CREATE',
        details: `Plan préventif "${plan.titre}" créé sur la machine ${machine.codeMachine}`,
        utilisateurId: currentUser?.idUser,
    });

    if (plan.technicienId) {
        notifierMaintenancePreventiveAffectee(plan, machine, plan.technicienId);
    }

    return plan;
}

export async function updatePlan(id, data, currentUser = null) {
    const planExistant = await prisma.planPreventif.findUnique({ where: { idPlan: id } });
    if (!planExistant) {
        throw new Error('Plan préventif introuvable');
    }

    if (data.technicienId) {
        const technicien = await prisma.user.findUnique({ where: { idUser: data.technicienId } });
        if (!technicien || technicien.role !== 'TECHNICIEN') {
            throw new Error("Le technicien assigné est invalide");
        }
    }

    const updateData = {
        titre: data.titre,
        description: data.description,
        frequence: data.frequence,
        intervalleJours: data.intervalleJours,
        technicienId: data.technicienId,
        statut: data.statut,
    };
    // On ne garde que les champs réellement fournis (évite d'écraser avec `undefined` -> Prisma ignore déjà
    // les undefined, mais on filtre explicitement pour la clarté).
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    if (updateData.technicienId != null && updateData.technicienId !== planExistant.technicienId) {
        updateData.dateAffectation = new Date();
    }

    const planMisAJour = await prisma.planPreventif.update({
        where: { idPlan: id },
        data: updateData,
    });

    auditService.logAction({
        entite: 'PlanPreventif',
        entiteId: id,
        action: 'UPDATE',
        details: `Champs modifiés : ${Object.keys(updateData).join(', ')}`,
        utilisateurId: currentUser?.idUser,
    });

    const technicienVientDetreAffecte =
        updateData.technicienId != null && updateData.technicienId !== planExistant.technicienId;

    if (technicienVientDetreAffecte) {
        const machine = await prisma.machine.findUnique({ where: { idMachine: planExistant.machineId } });
        notifierMaintenancePreventiveAffectee(planMisAJour, machine, updateData.technicienId);
    }

    return planMisAJour;
}

export async function deletePlan(id, currentUser = null) {
    const planExistant = await prisma.planPreventif.findUnique({ where: { idPlan: id } });
    if (!planExistant) {
        throw new Error('Plan préventif introuvable');
    }

    await prisma.planPreventif.delete({ where: { idPlan: id } });

    auditService.logAction({
        entite: 'PlanPreventif',
        entiteId: id,
        action: 'DELETE',
        details: `Plan préventif "${planExistant.titre}" supprimé`,
        utilisateurId: currentUser?.idUser,
    });
}

export async function getPlans(currentUser = null) {
    const where = currentUser?.role === 'TECHNICIEN' ? { technicienId: currentUser.idUser } : undefined;

    return prisma.planPreventif.findMany({
        where,
        include: { machine: true, technicien: true },
        orderBy: { dateProchaine: 'asc' },
    });
}

export async function getPlanDetailsById(id, currentUser = null) {
    const plan = await prisma.planPreventif.findUnique({
        where: { idPlan: id },
        include: {
            machine: true,
            technicien: true,
            historique: {
                include: { technicien: true },
                orderBy: { dateRealisation: 'desc' },
            },
        },
    });

    if (!plan) return null;

    if (currentUser?.role === 'TECHNICIEN' && plan.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez consulter que vos plans affectés');
    }

    return plan;
}

export async function getPlansByMachineId(machineId) {
    return prisma.planPreventif.findMany({
        where: { machineId },
        include: { technicien: true },
        orderBy: { dateProchaine: 'asc' },
    });
}

// Réalise un plan : enregistre l'historique et recalcule la prochaine échéance.
export async function realiserPlan(id, currentUser = null, remarque = null) {
    const plan = await prisma.planPreventif.findUnique({ where: { idPlan: id } });
    if (!plan) {
        throw new Error('Plan préventif introuvable');
    }

    if (plan.statut === 'INACTIF') {
        throw new Error('Ce plan est inactif');
    }

    if (currentUser?.role === 'TECHNICIEN' && plan.technicienId !== currentUser.idUser) {
        throw new Error('Vous ne pouvez réaliser que vos plans affectés');
    }

    if (plan.dateDerniereRealisation) {
        const maintenant0 = new Date();
        maintenant0.setHours(0, 0, 0, 0);
        const derniereRealisation0 = new Date(plan.dateDerniereRealisation);
        derniereRealisation0.setHours(0, 0, 0, 0);

        if (derniereRealisation0.getTime() === maintenant0.getTime()) {
            throw new Error('Cette maintenance a déjà été réalisée aujourd\'hui');
        }
    }

    const technicienId = currentUser?.role === 'TECHNICIEN' ? currentUser.idUser : plan.technicienId;
    if (!technicienId) {
        throw new Error("Impossible de réaliser un plan sans technicien assigné");
    }

    const maintenant = new Date();
    const [planMisAJour] = await prisma.$transaction([
        prisma.planPreventif.update({
            where: { idPlan: id },
            data: {
                dateDerniereRealisation: maintenant,
                dateProchaine: addDays(maintenant, plan.intervalleJours),
            },
        }),
        prisma.historiqueMaintenance.create({
            data: { planId: id, technicienId, remarque },
        }),
    ]);

    auditService.logAction({
        entite: 'PlanPreventif',
        entiteId: id,
        action: 'UPDATE',
        details: `Maintenance préventive "${plan.titre}" réalisée`,
        utilisateurId: currentUser?.idUser,
    });

    return planMisAJour;
}

// Résumé des plans en retard / bientôt dus (fenêtre de 7 jours), pour le badge et le dashboard.
export async function getAlertes() {
    const maintenant = new Date();
    const dansSeptJours = addDays(maintenant, 7);

    const [enRetard, bientot] = await Promise.all([
        prisma.planPreventif.findMany({
            where: { statut: 'ACTIF', dateProchaine: { lt: maintenant } },
            include: { machine: true, technicien: true },
            orderBy: { dateProchaine: 'asc' },
        }),
        prisma.planPreventif.findMany({
            where: { statut: 'ACTIF', dateProchaine: { gte: maintenant, lte: dansSeptJours } },
            include: { machine: true, technicien: true },
            orderBy: { dateProchaine: 'asc' },
        }),
    ]);

    return { enRetard, bientot };
}

// Job quotidien : notifie le technicien assigné (ou les responsables si personne n'est assigné)
// pour chaque plan dont l'échéance tombe aujourd'hui. Conçu pour être appelé une fois par jour
// (voir server.js) — ne fait jamais planter l'appelant.
export async function verifierEtNotifierEcheancesDuJour() {
    try {
        const debutJour = new Date();
        debutJour.setHours(0, 0, 0, 0);
        const finJour = new Date();
        finJour.setHours(23, 59, 59, 999);

        const plansDusAujourdhui = await prisma.planPreventif.findMany({
            where: { statut: 'ACTIF', dateProchaine: { gte: debutJour, lte: finJour } },
            include: { machine: true, technicien: true },
        });

        for (const plan of plansDusAujourdhui) {
            await notifierMaintenancePreventiveDue(plan, plan.machine, plan.technicien);
        }
    } catch (error) {
        console.warn('[maintenance-preventive] échec de la vérification des échéances :', error.message);
    }
}