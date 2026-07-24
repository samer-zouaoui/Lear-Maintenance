import prisma from '../config/db.js';
import { sendMail, buildPanneCritiqueEmail } from './email.service.js';
import { emitToUser } from '../config/socket.js';

export async function getNotificationsForUser(userId) {
    return prisma.notification.findMany({
        where: { destinataireId: userId },
        orderBy: { dateCreation: 'desc' },
        take: 50,
    });
}

export async function getUnreadCount(userId) {
    return prisma.notification.count({
        where: { destinataireId: userId, lu: false },
    });
}

export async function markAsRead(notificationId, userId) {
    // On filtre aussi par destinataireId pour qu'un user ne puisse pas marquer comme lue
    // une notification qui ne lui appartient pas.
    const result = await prisma.notification.updateMany({
        where: { idNotification: notificationId, destinataireId: userId },
        data: { lu: true },
    });
    if (result.count === 0) {
        throw new Error('Notification introuvable');
    }
}

export async function markAllAsRead(userId) {
    await prisma.notification.updateMany({
        where: { destinataireId: userId, lu: false },
        data: { lu: true },
    });
}

// Crée une notification en base pour chaque destinataire ET l'émet en temps réel (Socket.IO)
// vers ce destinataire s'il est connecté. Centralisé ici pour que toutes les notifs (panne
// critique, affectation panne, plan préventif, ...) passent par le même chemin DB + temps réel.
async function creerEtDiffuserNotifications(destinataireIds, { titre, message, panneId = null }) {
    const notifications = await Promise.all(
        destinataireIds.map((destinataireId) =>
            prisma.notification.create({
                data: { destinataireId, titre, message, panneId },
            })
        )
    );

    notifications.forEach((notif) => emitToUser(notif.destinataireId, 'notification:new', notif));

    return notifications;
}

// Déclenché à la création d'une panne CRITIQUE : notifie tous les ADMIN/RESPONSABLE_MAINTENANCE
// (in-app temps réel + email si le SMTP est configuré). Ne fait jamais échouer la création de la panne.
export async function notifierPanneCritique(panne, machine) {
    try {
        const destinataires = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'RESPONSABLE_MAINTENANCE'] } },
            select: { idUser: true, email: true },
        });

        if (destinataires.length === 0) return;

        await creerEtDiffuserNotifications(destinataires.map((u) => u.idUser), {
            titre: 'Panne critique déclarée',
            message: `${panne.titre} — machine ${machine?.codeMachine || panne.machineId}`,
            panneId: panne.idPanne,
        });

        const { subject, html } = buildPanneCritiqueEmail(panne, machine);
        // Envois en parallèle, chacun protégé individuellement dans sendMail (ne throw jamais).
        await Promise.all(destinataires.map((u) => sendMail({ to: u.email, subject, html })));
    } catch (error) {
        console.warn('[notifications] échec de la notification panne critique :', error.message);
    }
}

// Déclenché quand une panne est affectée (ou réaffectée) à un technicien :
// notifie ce technicien uniquement (in-app temps réel + email si SMTP configuré). Ne fait jamais échouer l'affectation.
export async function notifierPanneAffectee(panne, machine, technicienId) {
    try {
        const technicien = await prisma.user.findUnique({
            where: { idUser: technicienId },
            select: { idUser: true, email: true, nomUser: true },
        });

        if (!technicien) return;

        await creerEtDiffuserNotifications([technicien.idUser], {
            titre: 'Nouvelle panne affectée',
            message: `${panne.titre} — machine ${machine?.codeMachine || panne.machineId} vous a été affectée`,
            panneId: panne.idPanne,
        });

        await sendMail({
            to: technicien.email,
            subject: `Panne affectée : ${panne.titre}`,
            html: `<p>Bonjour ${technicien.nomUser || ''},</p><p>La panne <strong>${panne.titre}</strong> (machine ${machine?.codeMachine || panne.machineId}) vous a été affectée. Merci de la prendre en charge dès que possible.</p>`,
        });
    } catch (error) {
        console.warn('[notifications] échec de la notification affectation panne :', error.message);
    }
}

// Déclenché quand un plan de maintenance préventive est affecté (ou réaffecté) à un technicien :
// notifie ce technicien uniquement (in-app temps réel + email si SMTP configuré).
export async function notifierMaintenancePreventiveAffectee(plan, machine, technicienId) {
    try {
        const technicien = await prisma.user.findUnique({
            where: { idUser: technicienId },
            select: { idUser: true, email: true, nomUser: true },
        });

        if (!technicien) return;

        await creerEtDiffuserNotifications([technicien.idUser], {
            titre: 'Nouveau plan préventif affecté',
            message: `${plan.titre} — machine ${machine?.codeMachine || plan.machineId} vous a été affecté(e)`,
        });

        await sendMail({
            to: technicien.email,
            subject: `Plan préventif affecté : ${plan.titre}`,
            html: `<p>Bonjour ${technicien.nomUser || ''},</p><p>Le plan de maintenance préventive <strong>${plan.titre}</strong> (machine ${machine?.codeMachine || plan.machineId}) vous a été affecté. Prochaine échéance : ${new Date(plan.dateProchaine).toLocaleDateString('fr-FR')}.</p>`,
        });
    } catch (error) {
        console.warn('[notifications] échec de la notification affectation plan préventif :', error.message);
    }
}

// Déclenché par le job quotidien pour chaque plan préventif dont l'échéance tombe aujourd'hui.
// Notifie le technicien assigné ; à défaut, notifie les ADMIN/RESPONSABLE_MAINTENANCE.
export async function notifierMaintenancePreventiveDue(plan, machine, technicien) {
    try {
        let destinataires = [];

        if (technicien) {
            destinataires = [technicien];
        } else {
            destinataires = await prisma.user.findMany({
                where: { role: { in: ['ADMIN', 'RESPONSABLE_MAINTENANCE'] } },
                select: { idUser: true, email: true, nomUser: true },
            });
        }

        if (destinataires.length === 0) return;

        await creerEtDiffuserNotifications(destinataires.map((u) => u.idUser), {
            titre: 'Maintenance préventive à réaliser',
            message: `${plan.titre} — machine ${machine?.codeMachine || plan.machineId} — échéance aujourd'hui`,
        });

        await Promise.all(
            destinataires.map((u) =>
                sendMail({
                    to: u.email,
                    subject: `Maintenance préventive due : ${plan.titre}`,
                    html: `<p>Bonjour ${u.nomUser || ''},</p><p>La maintenance préventive <strong>${plan.titre}</strong> (machine ${machine?.codeMachine || plan.machineId}) arrive à échéance aujourd'hui.</p>`,
                })
            )
        );
    } catch (error) {
        console.warn('[notifications] échec de la notification maintenance préventive :', error.message);
    }
}