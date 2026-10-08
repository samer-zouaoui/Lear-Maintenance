import express from 'express';
import * as panneController from '../controllers/pannes.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadPannePhoto } from '../middlewares/upload.middleware.js';
import { requireRole } from '../middlewares/requireRole.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// 1. Routes avec chemins statiques fixes
router.get('/', panneController.getAllPannes);
router.get('/me', panneController.getMyPannes);
router.get('/suggestion-ia', panneController.getSuggestionIA);

router.get('/machine/:machineId', panneController.getPannesByMachineId);
router.post('/', panneController.createPanne);

router.get('/:id/details', panneController.getPanneDetailsById);
router.get('/:id', panneController.getPanneById);
router.put('/:id', panneController.updatePanne);
router.delete('/:id', panneController.deletePanne);
router.post('/:id/photo', uploadPannePhoto.single('photo'), panneController.uploadPannePhoto);
router.put('/:id/prendre-en-charge', requireRole('TECHNICIEN', 'RESPONSABLE_MAINTENANCE', 'ADMIN'), panneController.prendreEnCharge);
router.put('/:id/cloturer', requireRole('TECHNICIEN', 'RESPONSABLE_MAINTENANCE', 'ADMIN'), panneController.cloturerPanne);

export default router;