import * as planService from '../services/maintenance-preventive.service.js';

function statusFromError(message) {
    const map = {
        'Plan préventif introuvable': 404,
        "La machine n'existe pas": 400,
        "Le technicien assigné est invalide": 400,
        'Vous ne pouvez consulter que vos plans affectés': 403,
        'Vous ne pouvez réaliser que vos plans affectés': 403,
        'Ce plan est inactif': 403,
        "Cette maintenance a déjà été réalisée aujourd'hui": 403,
        "Impossible de réaliser un plan sans technicien assigné": 400,
    };
    return map[message] || 500;
}

export async function getAllPlans(req, res) {
    try {
        const plans = await planService.getPlans(req.user);
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAlertes(req, res) {
    try {
        const alertes = await planService.getAlertes();
        res.json(alertes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getPlanDetails(req, res) {
    try {
        const id = parseInt(req.params.id);
        const plan = await planService.getPlanDetailsById(id, req.user);
        if (plan) {
            res.json(plan);
        } else {
            res.status(404).json({ error: 'Plan préventif introuvable' });
        }
    } catch (error) {
        res.status(statusFromError(error.message)).json({ error: error.message });
    }
}

export async function getPlansByMachine(req, res) {
    try {
        const machineId = parseInt(req.params.machineId);
        const plans = await planService.getPlansByMachineId(machineId);
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function createPlan(req, res) {
    try {
        const plan = await planService.createPlan(req.body, req.user);
        res.status(201).json(plan);
    } catch (error) {
        res.status(statusFromError(error.message)).json({ error: error.message });
    }
}

export async function updatePlan(req, res) {
    try {
        const id = parseInt(req.params.id);
        const plan = await planService.updatePlan(id, req.body, req.user);
        res.json(plan);
    } catch (error) {
        res.status(statusFromError(error.message)).json({ error: error.message });
    }
}

export async function deletePlan(req, res) {
    try {
        const id = parseInt(req.params.id);
        await planService.deletePlan(id, req.user);
        res.status(204).end();
    } catch (error) {
        res.status(statusFromError(error.message)).json({ error: error.message });
    }
}

export async function realiserPlan(req, res) {
    try {
        const id = parseInt(req.params.id);
        const plan = await planService.realiserPlan(id, req.user, req.body?.remarque || null);
        res.json(plan);
    } catch (error) {
        res.status(statusFromError(error.message)).json({ error: error.message });
    }
}