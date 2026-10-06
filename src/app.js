import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Healthcheck route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'UniMart Backend API is running smoothly with ES Modules! 🚀',
    timestamp: new Date(),
  });
});

export default app;
