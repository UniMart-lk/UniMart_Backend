import prisma from '../config/prisma.js';

class CategoryController {
  /**
   * List all categories (optionally filter by type: MARKETPLACE or RENTAL)
   * GET /api/categories
   */
  async getCategories(req, res) {
    try {
      const { type, isActive } = req.query;

      const where = {};
      if (type) where.type = type.toUpperCase();
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const categories = await prisma.category.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      });

      return res.status(200).json({
        status: 'success',
        results: categories.length,
        data: { categories },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching categories.',
      });
    }
  }

  /**
   * Get single category by ID or slug
   * GET /api/categories/:id
   */
  async getCategoryById(req, res) {
    try {
      const param = req.params.id;
      const isNum = !isNaN(parseInt(param, 10));

      const category = await prisma.category.findFirst({
        where: isNum ? { id: parseInt(param, 10) } : { slug: param },
      });

      if (!category) {
        return res.status(404).json({
          status: 'error',
          message: 'Category not found.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching category.',
      });
    }
  }

  /**
   * Create a new category (Admin)
   * POST /api/categories
   */
  async createCategory(req, res) {
    try {
      const { name, type, description, slug, isActive } = req.body || {};

      if (!name || !type) {
        return res.status(400).json({
          status: 'error',
          message: 'Category name and type (MARKETPLACE or RENTAL) are required.',
        });
      }

      const generatedSlug = (slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const existing = await prisma.category.findUnique({
        where: { slug: generatedSlug },
      });

      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: 'A category with this slug or name already exists.',
        });
      }

      const category = await prisma.category.create({
        data: {
          name: name.trim(),
          slug: generatedSlug,
          type: type.toUpperCase(),
          description: description ? description.trim() : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });

      return res.status(201).json({
        status: 'success',
        message: 'Category created successfully.',
        data: { category },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while creating category.',
      });
    }
  }

  /**
   * Update category details (Admin)
   * PUT /api/categories/:id
   */
  async updateCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id, 10);
      const { name, type, description, slug, isActive } = req.body || {};

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID.',
        });
      }

      const updated = await prisma.category.update({
        where: { id: categoryId },
        data: {
          name: name ? name.trim() : undefined,
          slug: slug ? slug.trim().toLowerCase() : undefined,
          type: type ? type.toUpperCase() : undefined,
          description: description !== undefined ? description : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      return res.status(200).json({
        status: 'success',
        message: 'Category updated successfully.',
        data: { category: updated },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while updating category.',
      });
    }
  }

  /**
   * Delete category (Admin)
   * DELETE /api/categories/:id
   */
  async deleteCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id, 10);

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID.',
        });
      }

      await prisma.category.delete({
        where: { id: categoryId },
      });

      return res.status(200).json({
        status: 'success',
        message: 'Category deleted successfully.',
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while deleting category.',
      });
    }
  }
}

export default new CategoryController();

