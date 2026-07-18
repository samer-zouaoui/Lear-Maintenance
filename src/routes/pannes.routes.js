import express from 'express';
import * as panneController from '../controllers/pannes.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadPannePhoto } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', panneController.getAllPannes);
router.get('/me', panneController.getMyPannes);
router.post('/', panneController.createPanne);
router.get('/machine/:machineId', panneController.getPannesByMachineId);
router.get('/:id/details', panneController.getPanneDetailsById);
router.get('/:id', panneController.getPanneById);
router.put('/:id', panneController.updatePanne);
router.delete('/:id', panneController.deletePanne);
router.post('/:id/photo', uploadPannePhoto.single('photo'), panneController.uploadPannePhoto);

export default router;