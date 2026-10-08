import * as projetService from '../services/projets.service.js';
import { sendError } from '../utils/apiError.js';

export async function getAllProjet(req, res) {
    try {
        const filtre = req.query.statut || 'actifs';
        const projets = await projetService.getProjets(filtre);
        res.json(projets);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getProjetById(req, res) {
    try {
        const id = parseInt(req.params.id);
        const projet = await projetService.getProjetById(id);
        if (projet) {
            res.json(projet);
        } else {
            res.status(404).json({ error: 'Projet introuvable' });
        }
    } catch (error) {
        sendError(res, error);
    }
}

export async function createProjet(req, res) {
    try {
        const projet = await projetService.addProjet(req.body);
        res.status(201).json(projet);
    } catch (error) {
        sendError(res, error);
    }
}

export async function updateProjet(req, res) {
    try {
        const id = parseInt(req.params.id);
        const projet = await projetService.updateProjet(id, req.body);
        res.json(projet);
    } catch (error) {
        sendError(res, error);
    }
}

export async function deleteProjet(req, res) {
    try {
        const id = parseInt(req.params.id);
        await projetService.desactiverProjet(id);
        res.status(204).end();
    } catch (error) {
        sendError(res, error, { 'Projet introuvable': 404 });
    }
}

export async function reactivateProjet(req, res) {
    try {
        const id = parseInt(req.params.id);
        const projet = await projetService.reactiverProjet(id);
        res.json(projet);
    } catch (error) {
        sendError(res, error, { 'Projet introuvable': 404 });
    }
}