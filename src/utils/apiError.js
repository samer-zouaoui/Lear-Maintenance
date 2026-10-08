// Traduit n'importe quelle erreur (Prisma, JS générique, ou erreur métier lancée depuis un service)
// en un message français lisible par un non-informaticien, avec le bon code HTTP.
// Objectif : plus JAMAIS un stack trace Prisma brut envoyé au frontend.

const MESSAGES_PRISMA = {
    P2002: "Cette valeur existe déjà (doublon détecté).",
    P2003: "Action impossible : des données liées à cet élément existent encore.",
    P2025: "Élément introuvable.",
    P2014: "Cette action violerait un lien obligatoire entre deux éléments.",
};

const STATUTS_PRISMA = {
    P2002: 409,
    P2003: 409,
    P2025: 404,
    P2014: 409,
};

const MESSAGE_GENERIQUE = "Une erreur est survenue. Veuillez réessayer, ou contacter un administrateur si le problème persiste.";

// Un message est considéré "déjà lisible" (rédigé à la main dans nos services métier, en français)
// s'il ne ressemble pas à une erreur technique brute (stack Prisma, message multi-lignes, etc.).
function estMessageLisible(message) {
    if (!message || typeof message !== 'string') return false;
    if (message.toLowerCase().includes('prisma')) return false;
    if (message.includes('\n')) return false;
    if (/^Invalid `/.test(message)) return false;
    return true;
}

// `messagesConnus` : map optionnelle { "message exact lancé par le service": statusHTTP },
// pour les contrôleurs qui ont déjà une liste de cas métier précis (ex: 'Panne introuvable': 404).
export function resolveError(error, messagesConnus = {}) {
    if (messagesConnus[error?.message] !== undefined) {
        return { status: messagesConnus[error.message], message: error.message };
    }

    if (error?.code && MESSAGES_PRISMA[error.code]) {
        return { status: STATUTS_PRISMA[error.code] || 409, message: MESSAGES_PRISMA[error.code] };
    }

    if (estMessageLisible(error?.message)) {
        return { status: 400, message: error.message };
    }

    return { status: 500, message: MESSAGE_GENERIQUE };
}

// À utiliser dans chaque catch de contrôleur : `sendError(res, error)` ou
// `sendError(res, error, { 'Panne introuvable': 404, ... })`.
export function sendError(res, error, messagesConnus = {}) {
    // La vraie erreur (avec stack) reste dans les logs serveur pour le débogage,
    // seul le message traduit part au client.
    console.error(error);
    const { status, message } = resolveError(error, messagesConnus);
    res.status(status).json({ error: message });
}