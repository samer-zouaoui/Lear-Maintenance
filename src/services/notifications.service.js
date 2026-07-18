import prisma from '../config/db.js';
import { sendMail, buildPanneCritiqueEmail } from './email.service.js';

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

// Déclenché à la création d'une panne CRITIQUE : notifie tous les ADMIN/RESPONSABLE_MAINTENANCE
// (in-app systématiquement + email si le SMTP est configuré). Ne fait jamais échouer la création de la panne.
export async function notifierPanneCritique(panne, machine) {
    try {
        const destinataires = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'RESPONSABLE_MAINTENANCE'] } },
            select: { idUser: true, email: true },
        });

        if (destinataires.length === 0) return;

        await prisma.notification.createMany({
            data: destinataires.map((u) => ({
                destinataireId: u.idUser,
                panneId: panne.idPanne,
                titre: 'Panne critique déclarée',
                message: `${panne.titre} — machine ${machine?.codeMachine || panne.machineId}`,
            })),
        });

        const { subject, html } = buildPanneCritiqueEmail(panne, machine);
        // Envois en parallèle, chacun protégé individuellement dans sendMail (ne throw jamais).
        await Promise.all(destinataires.map((u) => sendMail({ to: u.email, subject, html })));
    } catch (error) {
        console.warn('[notifications] échec de la notification panne critique :', error.message);
    }
}

// Déclenché quand une panne est affectée (ou réaffectée) à un technicien :
// notifie ce technicien uniquement (in-app + email si SMTP configuré). Ne fait jamais échouer l'affectation.
export async function notifierPanneAffectee(panne, machine, technicienId) {
    try {
        const technicien = await prisma.user.findUnique({
            where: { idUser: technicienId },
            select: { idUser: true, email: true, nomUser: true },
        });

        if (!technicien) return;

        await prisma.notification.create({
            data: {
                destinataireId: technicien.idUser,
                panneId: panne.idPanne,
                titre: 'Nouvelle panne affectée',
                message: `${panne.titre} — machine ${machine?.codeMachine || panne.machineId} vous a été affectée`,
            },
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