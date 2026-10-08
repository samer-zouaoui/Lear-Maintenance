import express from 'express';
import * as projetController from '../controllers/projets.controller.js';

const router = express.Router();

router.get('/', projetController.getAllProjet);
router.post('/', projetController.createProjet);
router.get('/:id', projetController.getProjetById);
router.put('/:id', projetController.updateProjet);
router.put('/:id/reactiver', projetController.reactivateProjet);
router.delete('/:id', projetController.deleteProjet);

export default router;