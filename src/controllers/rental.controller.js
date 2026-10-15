import { Prisma } from '@prisma/client';
import rentalService from '../services/rental.service.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

class RentalController {
  /**
   * Handle rental feed request
   * GET /api/rentals?limit=20&cursor=123
   */
  async getRentalFeed(req, res) {
    try {
      const limit = req.query.limit === undefined ? DEFAULT_LIMIT : Number(req.query.limit);
      const cursor = req.query.cursor === undefined ? undefined : Number(req.query.cursor);

      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        return res.status(400).json({
          status: 'error',
          message: `limit must be a whole number between 1 and ${MAX_LIMIT}.`,
        });
      }

      if (cursor !== undefined && (!Number.isInteger(cursor) || cursor < 1)) {
        return res.status(400).json({
          status: 'error',
          message: 'cursor must be a positive whole number.',
        });
      }

      const result = await rentalService.getRentalFeed({ limit, cursor });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      console.error('Failed to load rental feed:', error);

      if (error instanceof Prisma.PrismaClientInitializationError) {
        return res.status(503).json({
          status: 'error',
          message: 'Rental service is temporarily unavailable. Please try again later.',
        });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Internal server error while loading rentals',
      });
    }
  }
}

export default new RentalController();
