import express from 'express';
import * as assistantController from '../controllers/assistant.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticateToken);
router.post('/chat', assistantController.chat);

export default router;