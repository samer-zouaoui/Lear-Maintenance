import express from 'express';
import * as planController from '../controllers/maintenance-preventive.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', planController.getAllPlans);
router.get('/alertes', planController.getAlertes);
router.post('/', planController.createPlan);
router.get('/machine/:machineId', planController.getPlansByMachine);
router.get('/:id', planController.getPlanDetails);
router.put('/:id', planController.updatePlan);
router.delete('/:id', planController.deletePlan);
router.post('/:id/realiser', planController.realiserPlan);

export default router;