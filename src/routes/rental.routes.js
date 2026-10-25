import { Router } from 'express';
import rentalController from '../controllers/rental.controller.js';

const router = Router();

// Public routes
router.get('/', (req, res) => rentalController.getRentalFeed(req, res));

export default router;
