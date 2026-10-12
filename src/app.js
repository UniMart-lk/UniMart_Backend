import express from 'express';
import cors from 'cors';
import compression from 'compression';

import rentalRoutes from './routes/rental.routes.js';

const app = express();

// Gzip responses larger than 1 KB (UNI-307 backend optimization)
app.use(compression());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rentals', rentalRoutes);

// Healthcheck route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'UniMart Backend API is running smoothly with ES Modules! 🚀',
    timestamp: new Date(),
  });
});

export default app;
