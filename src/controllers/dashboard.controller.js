import * as dashboardService from '../services/dashboard.service.js';
import { sendError } from '../utils/apiError.js';

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
        sendError(res, error);
    }
}

export async function getTauxDisponibilite(req, res) {
    try {
        const result = await dashboardService.getTauxDisponibilite();
        return res.json({ tauxDisponibilite: result });
    } catch (error) {
        sendError(res, error);
    }
}

export async function getClassementTechniciens(req, res) {
    try {
        const result = await dashboardService.getClassementTechniciens(parseDays(req));
        return res.json(result);
    } catch (error) {
        sendError(res, error);
    }
}


export async function getMachinesEnArret(req, res) {
    try {
        const result = await dashboardService.getMachinesEnArret();
        return res.json({ machinesEnArret: result });
    } catch (error) {
        sendError(res, error);
    }
}

export async function getDowntimeTotal(req, res) {
    try {
        const result = await dashboardService.getDowntimeTotal(parseDays(req), parseOffset(req));
        return res.json({ downtimeTotal: result });
    } catch (error) {
        sendError(res, error);
    }
}

export async function getTopMachines(req, res) {
    try {
        const result = await dashboardService.getTopMachines(parseDays(req));
        return res.json(result);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getTopCauses(req, res) {
    try {
        const result = await dashboardService.getTopCauses(parseDays(req));
        return res.json(result);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getMTBF(req, res) {
    try {
        const result = await dashboardService.getMTBF(parseDays(req), parseOffset(req));
        return res.json({ mtbf: result });
    } catch (error) {
        sendError(res, error);
    }
}

export async function getSerieQuotidienne(req, res) {
    try {
        const result = await dashboardService.getSerieQuotidienne(parseDays(req));
        return res.json(result);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getEtatAtelier(req, res) {
    try {
        const result = await dashboardService.getEtatAtelier();
        return res.json(result);
    } catch (error) {
        sendError(res, error);
    }
}
