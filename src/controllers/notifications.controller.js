import * as notificationsService from '../services/notifications.service.js';
import { sendError } from '../utils/apiError.js';

export async function getMyNotifications(req, res) {
    try {
        const notifications = await notificationsService.getNotificationsForUser(req.user.idUser);
        const unreadCount = await notificationsService.getUnreadCount(req.user.idUser);
        res.json({ notifications, unreadCount });
    } catch (error) {
        sendError(res, error);
    }
}

export async function markAsRead(req, res) {
    try {
        const id = parseInt(req.params.id);
        await notificationsService.markAsRead(id, req.user.idUser);
        res.status(204).end();
    } catch (error) {
        sendError(res, error, { 'Notification introuvable': 404 });
    }
}

export async function markAllAsRead(req, res) {
    try {
        await notificationsService.markAllAsRead(req.user.idUser);
        res.status(204).end();
    } catch (error) {
        sendError(res, error);
    }
}