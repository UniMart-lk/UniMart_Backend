import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Protected user profile routes
router.get('/profile', authenticate, (req, res) => userController.getProfile(req, res));
router.put('/profile', authenticate, (req, res) => userController.updateProfile(req, res));

// Public user query by ID
router.get('/:id', (req, res) => userController.getUserById(req, res));

export default router;

