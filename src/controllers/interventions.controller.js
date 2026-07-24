import * as interventionsService from '../services/interventions.service.js';
import { sendError } from '../utils/apiError.js';

function isDemandeur(req) {
    return req.user?.role === 'DEMANDEUR';
}

export async function getAllInterventions(req, res) {
    try {
        if (isDemandeur(req)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }
        const interventions = req.user?.role === 'TECHNICIEN'
            ? await interventionsService.getInterventionsByTechnicienId(req.user.idUser)
            : await interventionsService.getInterventions();
        res.json(interventions);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getMyInterventions(req, res) {
    try {
        if (isDemandeur(req)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }
        if (!req.user?.idUser) {
            return res.status(401).json({ error: 'Access token required' });
        }
        const interventions = await interventionsService.getInterventionsByTechnicienId(req.user.idUser);
        res.json(interventions);
    } catch (error) {
        sendError(res, error);
    }
}

export async function createIntervention(req, res) {
    try {
        const intervention = await interventionsService.addIntervention(req.body, req.user);
        res.status(201).json(intervention);
    } catch (error) {
        sendError(res, error, {
            'Panne introuvable': 404,
            'Accès interdit': 403,
            'La date de fin ne peut pas être antérieure à la date de début': 400,
        });
    }
}

export async function cloturerPanne(req, res) {
    try {
        const panneId = parseInt(req.params.panneId);
        const intervention = await interventionsService.cloturerPanneAvecIntervention(panneId, req.body, req.user);
        res.status(201).json(intervention);
    } catch (error) {
        sendError(res, error, {
            'Panne introuvable': 404,
            'La panne doit être en cours pour être clôturée': 400,
            'La date de fin ne peut pas être antérieure à la date de début': 400,
        });
    }
}

export async function getInterventionById(req, res) {
    try {
        if (isDemandeur(req)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }
        const id = parseInt(req.params.id);
        const intervention = await interventionsService.getInterventionById(id, req.user);
        if (intervention) {
            const duree = await interventionsService.calculerDuree(intervention);
            res.json({ ...intervention, dureeHeures: duree });
        } else {
            res.status(404).json({ error: "Intervention introuvable" });
        }
    } catch (error) {
        sendError(res, error, { 'Vous ne pouvez consulter que vos interventions': 403 });
    }
}

export async function updateIntervention(req, res) {
    try {
        if (isDemandeur(req)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }
        const id = parseInt(req.params.id);
        const intervention = await interventionsService.updateIntervention(id, req.body, req.user);
        res.json(intervention);
    } catch (error) {
        sendError(res, error, {
            'Intervention introuvable': 404,
            'Vous ne pouvez modifier que vos interventions': 403,
            'La date de fin ne peut pas être antérieure à la date de début': 400,
        });
    }
}

export async function deleteIntervention(req, res) {
    try {
        if (isDemandeur(req)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }
        const id = parseInt(req.params.id);
        await interventionsService.deleteIntervention(id, req.user);
        res.status(204).end();
    } catch (error) {
        sendError(res, error, {
            'Intervention introuvable': 404,
            'Vous ne pouvez supprimer que vos interventions': 403,
        });
    }
}

export async function getInterventionsByPanneId(req, res) {
    try {
        if (isDemandeur(req)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }
        const panneId = parseInt(req.params.panneId);
        const interventions = await interventionsService.getInterventionsByPanneId(panneId, req.user);
        res.json(interventions);
    } catch (error) {
        sendError(res, error, {
            'Panne introuvable': 404,
            'Vous ne pouvez consulter que vos pannes affectées': 403,
        });
    }
}

export async function calculerDuree(req, res) {
    try {
        if (isDemandeur(req)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }
        const id = parseInt(req.params.id);
        const intervention = await interventionsService.getInterventionById(id);
        if (intervention) {
            const duree = await interventionsService.calculerDuree(intervention);
            res.json({ duree });
        } else {
            res.status(404).json({ error: "Intervention introuvable" });
        }
    } catch (error) {
        sendError(res, error);
    }
}