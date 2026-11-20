import express from 'express';
import homeController from '../controllers/home.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/home - Main aggregated home feed for users & guests
router.get('/', optionalAuthenticate, homeController.getHomeFeed);

// GET /api/home/featured-products - Featured marketplace products
router.get('/featured-products', homeController.getFeaturedProducts);

// GET /api/home/featured-rentals - Featured rental listings
router.get('/featured-rentals', homeController.getFeaturedRentals);

// GET /api/home/categories - Active categories
router.get('/categories', homeController.getCategories);

// GET /api/home/notifications-count - Unread counts for authenticated user
router.get('/notifications-count', authenticate, homeController.getNotificationCount);
