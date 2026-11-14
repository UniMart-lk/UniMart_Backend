import prisma from '../config/prisma.js';

class AdminController {
  /**
   * Get all pending provider verification applications
   * GET /api/admin/providers/pending
   */
  async getPendingProviders(req, res) {
    try {
      const providers = await prisma.providerProfile.findMany({
        where: {
          verificationStatus: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              contactNumber: true,
              status: true,
              createdAt: true,
              userProfile: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({
        status: 'success',
        results: providers.length,
        data: {
          providers,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching pending providers.',
      });
    }
  }

  /**
   * Admin approve or reject a provider verification application
   * PATCH /api/admin/providers/:id/verify
   */
  async verifyProvider(req, res) {
    try {
      const providerId = parseInt(req.params.id, 10);
      const { status, rejectionReason } = req.body || {};

      if (!providerId || isNaN(providerId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid provider ID.',
        });
      }

      if (!['VERIFIED', 'REJECTED'].includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Status must be either VERIFIED or REJECTED.',
        });
      }

      const existingProvider = await prisma.providerProfile.findUnique({
        where: { id: providerId },
      });

      if (!existingProvider) {
        return res.status(404).json({
          status: 'error',
          message: 'Provider profile not found.',
        });
      }

      const isVerified = status === 'VERIFIED';

      const updated = await prisma.providerProfile.update({
        where: { id: providerId },
        data: {
          verificationStatus: status,
          verifiedAt: isVerified ? new Date() : null,
          rejectionReason: !isVerified ? (rejectionReason || 'Verification document did not meet criteria.') : null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              userProfile: true,
            },
          },
        },
      });

      return res.status(200).json({
        status: 'success',
        message: `Provider has been successfully ${isVerified ? 'VERIFIED' : 'REJECTED'}.`,
        data: {
          provider: updated,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while verifying provider.',
      });
    }
  }

  /**
   * List all platform users with pagination & filtering
   * GET /api/admin/users
   */
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;

      const { role, status, search } = req.query;

      const where = {};
      if (role) where.role = role;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { email: { contains: search } },
          { contactNumber: { contains: search } },
          { userProfile: { fullName: { contains: search } } },
        ];
      }

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            contactNumber: true,
            role: true,
            status: true,
            emailVerified: true,
            createdAt: true,
            userProfile: true,
            providerProfile: {
              select: {
                id: true,
                providerType: true,
                displayName: true,
                verificationStatus: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.user.count({ where }),
      ]);

      return res.status(200).json({
        status: 'success',
        results: users.length,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
        data: { users },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching users.',
      });
    }
  }

  /**
   * Update user account status (ACTIVE, SUSPENDED, DEACTIVATED)
   * PATCH /api/admin/users/:id/status
   */
  async updateUserStatus(req, res) {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      const { status } = req.body || {};

      if (!targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID.',
        });
      }

      if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Status must be ACTIVE, SUSPENDED, or DEACTIVATED.',
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { status },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({
        status: 'success',
        message: `User account status updated to ${status}.`,
        data: { user: updatedUser },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while updating user status.',
      });
    }
  }

  /**
   * System summary metrics for the Admin Overview Dashboard
   * GET /api/admin/analytics/metrics
   */
  async getMetrics(req, res) {
    try {
      const [
        totalUsers,
        totalStudents,
        totalProviders,
        pendingProviders,
        verifiedProviders,
        totalProducts,
        totalRentals,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.userProfile.count({ where: { userType: 'STUDENT' } }),
        prisma.providerProfile.count(),
        prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.providerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
        prisma.marketplaceProduct.count().catch(() => 0),
        prisma.rentalListing.count().catch(() => 0),
      ]);

      return res.status(200).json({
        status: 'success',
        data: {
          metrics: {
            totalUsers,
            totalStudents,
            totalProviders,
            pendingProviders,
            verifiedProviders,
            totalProducts,
            totalRentals,
          },
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while generating admin metrics.',
      });
    }
  }
}

export default new AdminController();

