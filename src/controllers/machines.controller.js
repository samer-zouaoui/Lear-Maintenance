import * as machineService from "../services/machines.service.js";
import { sendError } from '../utils/apiError.js';


// ?statut=actives (défaut) | archivees | toutes
export async function getAllMachine(req, res) {
    try {
        const statut = req.query.statut || 'actives';
        const machines = await machineService.getMachines(statut);
        res.json(machines);
    } catch (error) {
        sendError(res, error);
    }
}

export async function createMachine(req, res) {
    try {
        const machine = await machineService.addMachine(req.body);
        res.status(201).json(machine);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getMachineById(req, res) {
    try {
        const id = parseInt(req.params.id);
        const machine = await machineService.getMachineById(id);
        if (machine) {
            res.json(machine);
        } else {
            res.status(404).json({ error: "Machine introuvable" });
        }
    } catch (error) {
        sendError(res, error);
    }
}

export async function updateMachine(req, res) {
    try {
        const id = parseInt(req.params.id);
        const machine = await machineService.updateMachine(id, req.body);
        res.json(machine);
    } catch (error) {
        sendError(res, error);
    }
}

// "Supprimer" une machine l'archive au lieu de la supprimer réellement (voir machines.service.js).
export async function deleteMachine(req, res) {
    try {
        const id = parseInt(req.params.id);
        await machineService.archiveMachine(id);
        res.status(204).end();
    } catch (error) {
        sendError(res, error, { 'Machine introuvable': 404 });
    }
}

export async function reactivateMachine(req, res) {
    try {
        const id = parseInt(req.params.id);
        const machine = await machineService.reactivateMachine(id);
        res.json(machine);
    } catch (error) {
        sendError(res, error, { 'Machine introuvable': 404 });
    }
}

export async function getMachineForMobile(req, res) {
    try {
        const id = parseInt(req.params.id);
        const data = await machineService.getMachineForMobile(id);
        if (!data) {
            return res.status(404).json({ error: 'Machine introuvable' });
        }
        res.json(data);
    } catch (error) {
        sendError(res, error);
    }
}