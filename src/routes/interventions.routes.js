import express from 'express';
import * as interventionController from '../controllers/interventions.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router=express.Router();

router.use(authenticateToken);

router.get('/',interventionController.getAllInterventions);
router.get('/me', interventionController.getMyInterventions);
router.post('/',interventionController.createIntervention);
router.post('/panne/:panneId/cloturer', interventionController.cloturerPanne);
router.get('/panne/:panneId', interventionController.getInterventionsByPanneId);
router.get('/:id',interventionController.getInterventionById);
router.put('/:id',interventionController.updateIntervention);
router.delete('/:id',interventionController.deleteIntervention);
router.get('/:id/duree', interventionController.calculerDuree);

export default router;