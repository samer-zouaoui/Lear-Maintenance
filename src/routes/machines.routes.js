import express from 'express';
import * as machineController from '../controllers/machines.controller.js'

const router = express.Router();

router.get('/', machineController.getAllMachine);
router.post('/',machineController.createMachine);
router.get('/:id', machineController.getMachineById);
router.put('/:id', machineController.updateMachine);
router.put('/:id/reactiver', machineController.reactivateMachine);
router.delete('/:id', machineController.deleteMachine);
router.get('/:id/mobile', machineController.getMachineForMobile);

export default router;