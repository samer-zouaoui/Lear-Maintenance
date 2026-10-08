import { demanderAssistant } from '../services/assistantAgent.service.js';
import { sendError } from '../utils/apiError.js';

export async function chat(req, res) {
    try {
        const { message, historique } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'message est requis' });
        }
        const reponse = await demanderAssistant(message, historique || []);
        res.json({ reponse });
    } catch (error) {
        sendError(res, error);
    }
}