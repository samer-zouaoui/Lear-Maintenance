import express from 'express';
import * as ligneController from '../controllers/lignes.controller.js';

const router = express.Router();

router.get('/', ligneController.getAllLigne);          // ?projetId=1
router.post('/', ligneController.createLigne);
router.get('/:id', ligneController.getLigneById);
router.put('/:id', ligneController.updateLigne);
router.delete('/:id', ligneController.deleteLigne);

export default router;