import * as notificationsService from '../services/notifications.service.js';

export async function getMyNotifications(req, res) {
    try {
        const notifications = await notificationsService.getNotificationsForUser(req.user.idUser);
        const unreadCount = await notificationsService.getUnreadCount(req.user.idUser);
        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function markAsRead(req, res) {
    try {
        const id = parseInt(req.params.id);
        await notificationsService.markAsRead(id, req.user.idUser);
        res.status(204).end();
    } catch (error) {
        const statusCode = error.message === 'Notification introuvable' ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function markAllAsRead(req, res) {
    try {
        await notificationsService.markAllAsRead(req.user.idUser);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}