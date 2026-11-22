import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// In development or demo, allow authenticated access or require ADMIN role
const requireAdmin = [authenticate, authorize('ADMIN')];

// Provider management & verification
router.get('/providers', requireAdmin, (req, res) => adminController.getProviders(req, res));
router.get('/providers/pending', requireAdmin, (req, res) => adminController.getPendingProviders(req, res));
router.get('/providers/:id', requireAdmin, (req, res) => adminController.getProviderById(req, res));
router.patch('/providers/:id/verify', requireAdmin, (req, res) => adminController.verifyProvider(req, res));

// User account management
router.get('/users', requireAdmin, (req, res) => adminController.getUsers(req, res));
router.patch('/users/bulk-status', requireAdmin, (req, res) => adminController.bulkUpdateUserStatus(req, res));
router.post('/users/bulk-delete', requireAdmin, (req, res) => adminController.bulkDeleteUsers(req, res));
router.get('/users/:id', requireAdmin, (req, res) => adminController.getUserById(req, res));
router.patch('/users/:id/status', requireAdmin, (req, res) => adminController.updateUserStatus(req, res));
router.delete('/users/:id', requireAdmin, (req, res) => adminController.deleteUser(req, res));

// Analytics summary
router.get('/analytics/metrics', requireAdmin, (req, res) => adminController.getMetrics(req, res));

export default router;

