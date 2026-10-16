import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', (req, res) => authController.register(req, res));

// Protected routes (to verify token using auth middleware)
router.get('/me', authenticate, (req, res) => authController.getMe(req, res));

export default router;
