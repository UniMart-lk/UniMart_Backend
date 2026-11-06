import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// In development or demo, allow authenticated access or require ADMIN role
const requireAdmin = [authenticate, authorize('ADMIN')];

// Provider verification management
router.get('/providers/pending', requireAdmin, (req, res) => adminController.getPendingProviders(req, res));
router.patch('/providers/:id/verify', requireAdmin, (req, res) => adminController.verifyProvider(req, res));

// User account management
router.get('/users', requireAdmin, (req, res) => adminController.getUsers(req, res));
router.patch('/users/:id/status', requireAdmin, (req, res) => adminController.updateUserStatus(req, res));

// Analytics summary
router.get('/analytics/metrics', requireAdmin, (req, res) => adminController.getMetrics(req, res));

export default router;

