import nodemailer from 'nodemailer';

let transporter = null;

// Le SMTP est optionnel : si les variables d'env ne sont pas renseignées,
// on désactive juste l'envoi (avec un warning au démarrage) au lieu de planter le serveur.
function getTransporter() {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    return transporter;
}

// Envoi "best effort" : jamais d'exception propagée vers l'appelant (une panne
// de déclarer un ticket ne doit jamais dépendre de la disponibilité du SMTP).
export async function sendMail({ to, subject, html }) {
    const t = getTransporter();
    if (!t) {
        console.warn(`[email] SMTP non configuré — email "${subject}" à ${to} ignoré (voir .env.example).`);
        return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    try {
        await t.sendMail({
            from: process.env.EMAIL_FROM || 'Lear Maintenance <no-reply@lear-maintenance.local>',
            to,
            subject,
            html,
        });
        return { sent: true };
    } catch (error) {
        console.warn(`[email] échec de l'envoi à ${to} :`, error.message);
        return { sent: false, reason: error.message };
    }
}

export function buildPanneCritiqueEmail(panne, machine) {
    return {
        subject: `🔴 Panne critique déclarée — ${machine?.codeMachine || `machine #${panne.machineId}`}`,
        html: `
            <div style="font-family: Arial, sans-serif; color:#24262A;">
                <h2 style="color:#C8102E;">Nouvelle panne critique</h2>
                <p><strong>Titre :</strong> ${panne.titre}</p>
                <p><strong>Machine :</strong> ${machine?.codeMachine || panne.machineId} — ${machine?.nomMachine || ''}</p>
                <p><strong>Catégorie :</strong> ${panne.categorie}</p>
                <p><strong>Déclarée le :</strong> ${new Date(panne.dateCreation).toLocaleString('fr-FR')}</p>
                <p style="margin-top:20px;">Connecte-toi au tableau de bord pour l'affecter à un technicien.</p>
            </div>
        `,
    };
}