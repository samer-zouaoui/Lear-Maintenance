import * as pannesService from '../services/pannes.service.js';

export async function getAllPannes(req, res) {
    try {
        const pannes = req.user?.role === 'TECHNICIEN'
            ? await pannesService.getPannesByTechnicienId(req.user.idUser)
            : await pannesService.getPannes();
        res.json(pannes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getMyPannes(req, res) {
    try {
        if (!req.user?.idUser) {
            return res.status(401).json({ error: 'Access token required' });
        }
        const technicienId = req.user?.idUser;
        const pannes = await pannesService.getPannesByTechnicienId(technicienId);
        res.json(pannes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function createPanne(req, res) {
    try {
        const panne = await pannesService.addPanne(req.body, req.user);
        res.status(201).json(panne);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}   
 
export async function getPanneById(req, res) {
    try {
        const id = parseInt(req.params.id);
        const panne = await pannesService.getPanneById(id);
        if (panne) {
            res.json(panne);
        } else {
            res.status(404).json({ error: "Panne not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getPanneDetailsById(req, res) {
    try {
        const id = parseInt(req.params.id);
        const panne = await pannesService.getPanneDetailsById(id, req.user);
        if (panne) {
            res.json(panne);
        } else {
            res.status(404).json({ error: 'Panne not found' });
        }
    } catch (error) {
        const statusCode = error.message === 'Vous ne pouvez consulter que vos pannes affectées' ? 403 : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function updatePanne(req, res) {
    try {
        const id = parseInt(req.params.id);
        const panne = await pannesService.updatePanne(id, req.body, req.user);
        res.json(panne);
    } catch (error) {
        const statusCode = error.message === 'Panne introuvable'
            ? 404
            : error.message === 'Vous ne pouvez modifier que vos pannes affectées'
                ? 403
                : error.message === 'Une panne résolue ne peut plus être modifiée'
                    ? 403
                    : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function deletePanne(req, res) {
    try {
        const id = parseInt(req.params.id);
        await pannesService.deletePanne(id, req.user);
        res.status(204).end();
    } catch (error) {
        const statusCode = error.message === 'Panne introuvable'
            ? 404
            : error.message === 'Une panne résolue ne peut pas être supprimée'
                ? 403
                : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function uploadPannePhoto(req, res) {
    try {
        const id = parseInt(req.params.id);
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier reçu' });
        }
        const photoUrl = `/uploads/pannes/${req.file.filename}`;
        const panne = await pannesService.setPannePhoto(id, photoUrl, req.user);
        res.json(panne);
    } catch (error) {
        const statusCode = error.message === 'Panne introuvable'
            ? 404
            : error.message === 'Vous ne pouvez modifier que vos pannes affectées'
                ? 403
                : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function getPannesByMachineId(req, res) {
    try {
        const machineId = parseInt(req.params.machineId);
        const pannes = await pannesService.getPannesByMachineId(machineId);
        res.json(pannes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}