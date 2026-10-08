import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

// Routes initiales
router.get('/mttr', dashboardController.getMTTR);
router.get('/disponibilite', dashboardController.getTauxDisponibilite);
router.get('/classement', dashboardController.getClassementTechniciens);

// Nouvelles routes
router.get('/machines-arret', dashboardController.getMachinesEnArret);
router.get('/downtime', dashboardController.getDowntimeTotal);
router.get('/top-machines', dashboardController.getTopMachines);
router.get('/top-causes', dashboardController.getTopCauses);
router.get('/mtbf', dashboardController.getMTBF);
router.get('/serie-quotidienne', dashboardController.getSerieQuotidienne);
router.get('/atelier', dashboardController.getEtatAtelier);
router.get('/rapport-hebdo', dashboardController.getRapportHebdomadaire);

export default router;