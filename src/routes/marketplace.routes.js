import { Router } from 'express';
import marketplaceController from '../controllers/marketplace.controller.js';

const router = Router();

// Categories route must precede /:id so 'categories' is not parsed as an id
router.get('/categories', (req, res) => marketplaceController.getCategories(req, res));

// Marketplace product feed (search, filter, sort, cursor pagination)
router.get('/', (req, res) => marketplaceController.getMarketplaceFeed(req, res));

// Single product details
router.get('/:id', (req, res) => marketplaceController.getProductById(req, res));

export default router;
