import { Router } from 'express';
import marketplaceController from '../controllers/marketplace.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Categories route must precede /:id so 'categories' is not parsed as an id
router.get('/categories', (req, res) => marketplaceController.getCategories(req, res));

// My listings route (authenticated) - must precede /:id
router.get('/my-listings', authenticate, (req, res) => marketplaceController.getMyListings(req, res));

// Marketplace product feed (search, filter, sort, cursor pagination)
router.get('/', (req, res) => marketplaceController.getMarketplaceFeed(req, res));

// Single product details
router.get('/:id', (req, res) => marketplaceController.getProductById(req, res));

// Create a new product listing (authenticated)
router.post('/', authenticate, (req, res) => marketplaceController.createProduct(req, res));

// Update product status (e.g. mark as sold) (authenticated)
router.patch('/:id/status', authenticate, (req, res) => marketplaceController.updateProductStatus(req, res));

// Delete a product listing (authenticated)
router.delete('/:id', authenticate, (req, res) => marketplaceController.deleteProduct(req, res));

export default router;
