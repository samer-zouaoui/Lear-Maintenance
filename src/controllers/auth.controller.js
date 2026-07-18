import * as authService from '../services/auth.service.js';

export async function registerUser(req, res) {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } 
}

export async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        const user = await authService.loginUser(email, password);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getUserById(req, res) {
    try {
        const id = parseInt(req.params.id);
        const user = await authService.getUserById(id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateUser(req, res) {
    try {
        const id = parseInt(req.params.id);
        const user = await authService.updateUser(id, req.body);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteUser(req, res) {
    try {
        const id = parseInt(req.params.id);
        await authService.deleteUser(id);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllUsers(req, res) {
    try {
        const users = await authService.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getUserByEmail(req, res) {
    try {
        const email = req.params.email;
        const user = await authService.getUserByEmail(email);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

