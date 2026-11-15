import express from 'express';
import cors from 'cors';
import compression from 'compression';

import rentalRoutes from './routes/rental.routes.js';
import authRoutes from './routes/auth.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import userRoutes from './routes/user.routes.js';
import providerRoutes from './routes/provider.routes.js';
import adminRoutes from './routes/admin.routes.js';
import categoryRoutes from './routes/category.routes.js';

const app = express();

// Gzip responses larger than 1 KB (UNI-307 backend optimization)
app.use(compression());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Healthcheck route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'UniMart Backend API is running smoothly with ES Modules! 🚀',
    timestamp: new Date(),
  });
});

export default app;
