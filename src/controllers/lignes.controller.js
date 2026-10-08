import * as ligneService from '../services/lignes.service.js';
import { sendError } from '../utils/apiError.js';

export async function getAllLigne(req, res) {
    try {
        const projetId = req.query.projetId ? parseInt(req.query.projetId) : undefined;
        const lignes = await ligneService.getLignes(projetId);
        res.json(lignes);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getLigneById(req, res) {
    try {
        const id = parseInt(req.params.id);
        const ligne = await ligneService.getLigneById(id);
        if (ligne) {
            res.json(ligne);
        } else {
            res.status(404).json({ error: 'Ligne introuvable' });
        }
    } catch (error) {
        sendError(res, error);
    }
}

export async function createLigne(req, res) {
    try {
        const ligne = await ligneService.addLigne(req.body);
        res.status(201).json(ligne);
    } catch (error) {
        sendError(res, error);
    }
}

export async function updateLigne(req, res) {
    try {
        const id = parseInt(req.params.id);
        const ligne = await ligneService.updateLigne(id, req.body);
        res.json(ligne);
    } catch (error) {
        sendError(res, error);
    }
}

export async function deleteLigne(req, res) {
    try {
        const id = parseInt(req.params.id);
        await ligneService.desactiverLigne(id);
        res.status(204).end();
    } catch (error) {
        sendError(res, error, { 'Ligne introuvable': 404 });
    }
}