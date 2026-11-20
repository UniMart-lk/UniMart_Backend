import express from 'express';
import homeController from '../controllers/home.controller.js';
import { optionalAuthenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/home - Main aggregated home feed for users & guests
router.get('/', optionalAuthenticate, homeController.getHomeFeed);
