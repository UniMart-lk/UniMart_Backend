import { Prisma } from '@prisma/client';
import marketplaceService from '../services/marketplace.service.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const ALLOWED_SORT_OPTIONS = [
  'Newest',
  'Price: Low to High',
  'Price: High to Low',
  'Highest Rated',
];

class MarketplaceController {
  /**
   * Handle marketplace feed request
   * GET /api/marketplace?limit=20&cursor=123&category=Books&search=calculus&sort=Newest
   */
  async getMarketplaceFeed(req, res) {
    try {
      const limit = req.query.limit === undefined ? DEFAULT_LIMIT : Number(req.query.limit);
      const cursor = req.query.cursor === undefined ? undefined : Number(req.query.cursor);
      const category = req.query.category ? String(req.query.category).trim() : undefined;
      const search = req.query.search ? String(req.query.search).trim() : undefined;
      const sort = req.query.sort ? String(req.query.sort).trim() : 'Newest';

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

      if (sort && !ALLOWED_SORT_OPTIONS.includes(sort)) {
        return res.status(400).json({
          status: 'error',
          message: `sort must be one of: ${ALLOWED_SORT_OPTIONS.join(', ')}`,
        });
      }

      const result = await marketplaceService.getMarketplaceFeed({
        limit,
        cursor,
        category,
        search,
        sort,
      });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      console.error('Failed to load marketplace feed:', error);

      if (error instanceof Prisma.PrismaClientInitializationError) {
        return res.status(503).json({
          status: 'error',
          message: 'Marketplace service is temporarily unavailable. Please try again later.',
        });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Internal server error while loading marketplace feed',
      });
    }
  }

  /**
   * Handle single product retrieval
   * GET /api/marketplace/:id
   */
  async getProductById(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Product ID must be a valid positive integer.',
        });
      }

      const product = await marketplaceService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: `Product with ID ${id} was not found.`,
        });
      }

      return res.status(200).json({
        status: 'success',
        data: product,
      });
    } catch (error) {
      console.error('Failed to retrieve product:', error);

      if (error instanceof Prisma.PrismaClientInitializationError) {
        return res.status(503).json({
          status: 'error',
          message: 'Marketplace service is temporarily unavailable. Please try again later.',
        });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Internal server error while retrieving product',
      });
    }
  }

  /**
   * Handle marketplace categories retrieval
   * GET /api/marketplace/categories
   */
  async getCategories(req, res) {
    try {
      const categories = await marketplaceService.getCategories();

      return res.status(200).json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      console.error('Failed to retrieve categories:', error);

      if (error instanceof Prisma.PrismaClientInitializationError) {
        return res.status(503).json({
          status: 'error',
          message: 'Database service is temporarily unavailable.',
        });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Internal server error while retrieving categories',
      });
    }
  }
}

export default new MarketplaceController();
