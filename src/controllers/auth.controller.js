import * as authService from '../services/auth.service.js';
import { sendError } from '../utils/apiError.js';

export async function registerUser(req, res) {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        sendError(res, error);
    }
}

export async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        const user = await authService.loginUser(email, password);
        res.json(user);
    } catch (error) {
        sendError(res, error, {
            'Utilisateur non trouvé': 401,
            'Mot de passe incorrect': 401,
            'Ce compte a été désactivé. Contactez un administrateur.': 403,
        });
    }
}

export async function getUserById(req, res) {
    try {
        const id = parseInt(req.params.id);
        const user = await authService.getUserById(id);
        res.json(user);
    } catch (error) {
        sendError(res, error);
    }
}

export async function updateUser(req, res) {
    try {
        const id = parseInt(req.params.id);
        const user = await authService.updateUser(id, req.body);
        res.json(user);
    } catch (error) {
        sendError(res, error);
    }
}

// "Supprimer" un compte = le désactiver (soft delete). On ne supprime jamais réellement la ligne,
// pour ne jamais perdre l'historique des interventions/maintenances réalisées par cette personne.
export async function deleteUser(req, res) {
    try {
        const id = parseInt(req.params.id);
        await authService.deactivateUser(id);
        res.status(204).end();
    } catch (error) {
        sendError(res, error, { 'Utilisateur introuvable': 404 });
    }
}

export async function reactivateUser(req, res) {
    try {
        const id = parseInt(req.params.id);
        const user = await authService.reactivateUser(id);
        res.json(user);
    } catch (error) {
        sendError(res, error, { 'Utilisateur introuvable': 404 });
    }
}

// ?statut=actifs (défaut) | inactifs | tous
export async function getAllUsers(req, res) {
    try {
        const statut = req.query.statut || 'actifs';
        const users = await authService.getAllUsers(statut);
        res.json(users);
    } catch (error) {
        sendError(res, error);
    }
}

export async function getUserByEmail(req, res) {
    try {
        const email = req.params.email;
        const user = await authService.getUserByEmail(email);
        res.json(user);
    } catch (error) {
        sendError(res, error);
    }
}