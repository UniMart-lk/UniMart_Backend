import { Router } from 'express';
import providerController from '../controllers/provider.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Public provider registration
router.post('/register', (req, res) => providerController.registerProvider(req, res));

// Protected provider verification submission
router.post('/verify', authenticate, (req, res) => providerController.submitVerification(req, res));
router.put('/verify', authenticate, (req, res) => providerController.submitVerification(req, res));

// Authenticated provider profile
router.get('/profile', authenticate, (req, res) => providerController.getMyProviderProfile(req, res));

// Public provider query
router.get('/:id', (req, res) => providerController.getProviderById(req, res));

export default router;

