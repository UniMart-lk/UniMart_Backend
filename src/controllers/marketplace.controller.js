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
   * GET /api/marketplace?limit=20&cursor=123&category=Books&search=calculus&sort=Newest&maxPrice=50000
   */
  async getMarketplaceFeed(req, res) {
    try {
      const limit = req.query.limit === undefined ? DEFAULT_LIMIT : Number(req.query.limit);
      const cursor = req.query.cursor === undefined ? undefined : Number(req.query.cursor);
      const category = req.query.category ? String(req.query.category).trim() : undefined;
      const search = req.query.search ? String(req.query.search).trim() : undefined;
      const sort = req.query.sort ? String(req.query.sort).trim() : 'Newest';
      const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
      const conditions = req.query.conditions;
      const minRating = req.query.minRating !== undefined ? Number(req.query.minRating) : undefined;
      const providerType = req.query.providerType ? String(req.query.providerType).trim() : undefined;

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
        maxPrice,
        conditions,
        minRating,
        providerType,
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
   * Handle product listing creation
   * POST /api/marketplace
   */
  async createProduct(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'You must be logged in to post a product.',
        });
      }

      const createdProduct = await marketplaceService.createProduct(userId, req.body);

      return res.status(201).json({
        status: 'success',
        message: 'Product posted successfully!',
        data: createdProduct,
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to create product listing.',
      });
    }
  }

  /**
   * Handle fetching user's own listings
   * GET /api/marketplace/my-listings
   */
  async getMyListings(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'You must be logged in to view your listings.',
        });
      }

      const listings = await marketplaceService.getMyListings(userId);

      return res.status(200).json({
        status: 'success',
        data: listings,
      });
    } catch (error) {
      console.error('Failed to retrieve user listings:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve your product listings.',
      });
    }
  }

  /**
   * Handle updating product status
   * PATCH /api/marketplace/:id/status
   */
  async updateProductStatus(req, res) {
    try {
      const id = Number(req.params.id);
      const userId = req.user?.id;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({
          status: 'error',
          message: 'Product ID and status are required.',
        });
      }

      const updated = await marketplaceService.updateProductStatus(id, userId, status);

      return res.status(200).json({
        status: 'success',
        message: 'Product status updated successfully.',
        data: updated,
      });
    } catch (error) {
      console.error('Failed to update product status:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to update product status.',
      });
    }
  }

  /**
   * Handle deleting a product
   * DELETE /api/marketplace/:id
   */
  async deleteProduct(req, res) {
    try {
      const id = Number(req.params.id);
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'Product ID is required.',
        });
      }

      const result = await marketplaceService.deleteProduct(id, userId);

      return res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      console.error('Failed to delete product:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to delete product.',
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
