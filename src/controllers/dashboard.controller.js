import * as dashboardService from '../services/dashboard.service.js';

// Lit ?days=7|30|90 sur la requête. Retourne undefined si absent ou invalide (= pas de filtre, période complète).
function parseDays(req) {
    const days = parseInt(req.query.days, 10);
    return Number.isFinite(days) && days > 0 ? days : undefined;
}

// Lit ?offset=N (nombre de jours à décaler la fenêtre vers le passé, pour comparer à la période précédente).
function parseOffset(req) {
    const offset = parseInt(req.query.offset, 10);
    return Number.isFinite(offset) && offset > 0 ? offset : 0;
}

export async function getMTTR(req, res) {
    try {
        const result = await dashboardService.getMTTR(parseDays(req), parseOffset(req));
        return res.json({ mttr: result });
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération du MTTR", 
            error: error.message 
        });
    }
}

export async function getTauxDisponibilite(req, res) {
    try {
        const result = await dashboardService.getTauxDisponibilite();
        return res.json({ tauxDisponibilite: result });
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération du taux de disponibilité", 
            error: error.message 
        });
    }
}

export async function getClassementTechniciens(req, res) {
    try {
        const result = await dashboardService.getClassementTechniciens(parseDays(req));
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération du classement des techniciens", 
            error: error.message 
        });
    }
}


export async function getMachinesEnArret(req, res) {
    try {
        const result = await dashboardService.getMachinesEnArret();
        return res.json({ machinesEnArret: result });
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération des machines en arrêt", 
            error: error.message 
        });
    }
}

export async function getDowntimeTotal(req, res) {
    try {
        const result = await dashboardService.getDowntimeTotal(parseDays(req), parseOffset(req));
        return res.json({ downtimeTotal: result });
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération du downtime total", 
            error: error.message 
        });
    }
}

export async function getTopMachines(req, res) {
    try {
        const result = await dashboardService.getTopMachines(parseDays(req));
        return res.json(result); 
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération du top des machines", 
            error: error.message 
        });
    }
}

export async function getTopCauses(req, res) {
    try {
        const result = await dashboardService.getTopCauses(parseDays(req));
        return res.json(result); 
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération du top des causes", 
            error: error.message 
        });
    }
}

export async function getMTBF(req, res) {
    try {
        const result = await dashboardService.getMTBF(parseDays(req), parseOffset(req));
        return res.json({ mtbf: result });
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération du MTBF", 
            error: error.message 
        });
    }
}

export async function getSerieQuotidienne(req, res) {
    try {
        const result = await dashboardService.getSerieQuotidienne(parseDays(req));
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ 
            message: "Erreur lors de la récupération de la série quotidienne", 
            error: error.message 
        });
    }
}