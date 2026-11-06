import { Router } from 'express';
import categoryController from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Public category endpoints
router.get('/', (req, res) => categoryController.getCategories(req, res));
router.get('/:id', (req, res) => categoryController.getCategoryById(req, res));

// Admin category management endpoints
const requireAdmin = [authenticate, authorize('ADMIN')];

router.post('/', requireAdmin, (req, res) => categoryController.createCategory(req, res));
router.put('/:id', requireAdmin, (req, res) => categoryController.updateCategory(req, res));
router.delete('/:id', requireAdmin, (req, res) => categoryController.deleteCategory(req, res));

export default router;

