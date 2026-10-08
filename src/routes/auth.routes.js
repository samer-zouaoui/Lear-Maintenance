import express from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', authController.registerUser);  
router.post('/login', authController.loginUser);
router.get('/:id', authController.getUserById);
router.put('/:id', authController.updateUser);
router.put('/:id/reactiver', authController.reactivateUser);
router.delete('/:id', authController.deleteUser);
router.get('/', authController.getAllUsers);
router.get('/email/:email', authController.getUserByEmail);

export default router;