import express from 'express';
import * as notificationsController from '../controllers/notifications.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', notificationsController.getMyNotifications);
router.put('/:id/lue', notificationsController.markAsRead);
router.put('/lues/toutes', notificationsController.markAllAsRead);

export default router;