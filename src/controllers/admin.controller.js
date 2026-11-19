import prisma from '../config/prisma.js';
import emailService from '../services/email.service.js';

class AdminController {
  /**
   * List all platform providers with pagination, filtering, sorting, and counts
   * GET /api/admin/providers
   */
  async getProviders(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const skip = (page - 1) * limit;

      const {
        providerType,
        verificationStatus,
        excludeVerificationStatus,
        accountStatus,
        search,
        sort,
      } = req.query;

      const baseWhere = {};
      if (excludeVerificationStatus) {
        baseWhere.verificationStatus = { not: excludeVerificationStatus };
      } else if (verificationStatus && verificationStatus === 'VERIFIED') {
        baseWhere.verificationStatus = 'VERIFIED';
      }

      const where = { ...baseWhere };
      if (providerType) where.providerType = providerType;
      if (verificationStatus) where.verificationStatus = verificationStatus;
      if (accountStatus) {
        where.user = { is: { status: accountStatus } };
      }

      if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
          { displayName: { contains: term } },
          { user: { is: { email: { contains: term } } } },
          { user: { is: { contactNumber: { contains: term } } } },
          { user: { is: { userProfile: { is: { fullName: { contains: term } } } } } },
        ];
      }

      let orderBy = { createdAt: 'desc' };
      if (sort === 'oldest') {
        orderBy = { createdAt: 'asc' };
      } else if (sort === 'name_asc') {
        orderBy = { displayName: 'asc' };
      } else if (sort === 'rating_desc') {
        orderBy = { overallRating: 'desc' };
      }

      const [
        providers,
        totalCount,
        allCount,
        studentProviderCount,
        externalProviderCount,
        pendingCount,
        verifiedCount,
        rejectedCount,
        suspendedCount,
      ] = await Promise.all([
        prisma.providerProfile.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                contactNumber: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                userProfile: true,
              },
            },
            _count: {
              select: {
                marketplaceProducts: true,
                rentalListings: true,
                reviewsReceived: true,
              },
            },
          },
          orderBy,
        }),
        prisma.providerProfile.count({ where }),
        prisma.providerProfile.count({ where: baseWhere }),
        prisma.providerProfile.count({
          where: { ...baseWhere, providerType: 'STUDENT_PROVIDER' },
        }),
        prisma.providerProfile.count({
          where: { ...baseWhere, providerType: 'EXTERNAL_PROVIDER' },
        }),
        prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.providerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
        prisma.providerProfile.count({ where: { verificationStatus: 'REJECTED' } }),
        prisma.providerProfile.count({
          where: { ...baseWhere, user: { is: { status: 'SUSPENDED' } } },
        }),
      ]);

      return res.status(200).json({
        status: 'success',
        results: providers.length,
        total: totalCount,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        counts: {
          all: allCount,
          studentProviders: studentProviderCount,
          externalProviders: externalProviderCount,
          pending: pendingCount,
          verified: verifiedCount,
          rejected: rejectedCount,
          suspended: suspendedCount,
        },
        data: { providers },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching providers.',
      });
    }
  }

  /**
   * Fetch detailed single provider profile by provider ID
   * GET /api/admin/providers/:id
   */
  async getProviderById(req, res) {
    try {
      const providerId = parseInt(req.params.id, 10);
      if (!providerId || isNaN(providerId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid provider ID.',
        });
      }

      const provider = await prisma.providerProfile.findUnique({
        where: { id: providerId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              contactNumber: true,
              role: true,
              status: true,
              emailVerified: true,
              createdAt: true,
              userProfile: true,
            },
          },
          _count: {
            select: {
              marketplaceProducts: true,
              rentalListings: true,
              reviewsReceived: true,
            },
          },
        },
      });

      if (!provider) {
        return res.status(404).json({
          status: 'error',
          message: 'Provider profile not found.',
        });
      }

      const profile = provider.user?.userProfile;
      const duplicateConditions = [];
      if (profile?.universityIdNumber) {
        duplicateConditions.push({ universityIdNumber: profile.universityIdNumber });
      }
      if (profile?.nicNumber) {
        duplicateConditions.push({ nicNumber: profile.nicNumber });
      }

      const [duplicateCount, activeReportCount] = await Promise.all([
        duplicateConditions.length > 0
          ? prisma.userProfile.count({
              where: {
                userId: { not: provider.userId },
                OR: duplicateConditions,
              },
            })
          : Promise.resolve(0),
        prisma.report.count({
          where: {
            reportedUserId: provider.userId,
            status: { not: 'DISMISSED' },
          },
        }),
      ]);

      const verificationChecks = {
        noDuplicateAccount: duplicateCount === 0,
        noViolations: activeReportCount === 0,
        profileCompleted: Boolean(profile?.isCompleted),
        hasVerificationDoc: Boolean(
          provider.verificationDocUrl || profile?.privacySettings?.studentEvidenceUrl
        ),
        activeReportCount,
      };

      return res.status(200).json({
        status: 'success',
        data: {
          provider: {
            ...provider,
            verificationChecks,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching provider details.',
      });
    }
  }

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

      if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Status must be VERIFIED, REJECTED, or PENDING.',
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
      const isRejected = status === 'REJECTED';

      const updated = await prisma.providerProfile.update({
        where: { id: providerId },
        data: {
          verificationStatus: status,
          verifiedAt: isVerified ? new Date() : null,
          rejectionReason: isVerified
            ? null
            : rejectionReason ||
              (isRejected
                ? 'Verification document did not meet criteria.'
                : 'Additional verification details or documents requested by admin.'),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              contactNumber: true,
              status: true,
              emailVerified: true,
              createdAt: true,
              userProfile: true,
            },
          },
          _count: {
            select: {
              marketplaceProducts: true,
              rentalListings: true,
              reviewsReceived: true,
            },
          },
        },
      });

      // Notify provider asynchronously
      const notifTitle = isVerified
        ? 'Provider Account Verified'
        : isRejected
          ? 'Provider Verification Rejected'
          : 'Additional Verification Info Requested';
      const notifContent = isVerified
        ? 'Congratulations! Your UniMart provider verification has been approved by an administrator.'
        : updated.rejectionReason;

      prisma.notification
        .create({
          data: {
            recipientId: existingProvider.userId,
            type: 'VERIFICATION_UPDATE',
            title: notifTitle,
            content: notifContent,
            referenceType: 'PROVIDER_PROFILE',
            referenceId: existingProvider.id,
          },
        })
        .catch(() => {});

      // Send "Profile Verified" email once admin approves the provider
      if (isVerified && existingProvider.verificationStatus !== 'VERIFIED') {
        const accountLabel =
          updated.providerType === 'EXTERNAL_PROVIDER'
            ? 'External Provider'
            : 'Student Provider';

        emailService
          .sendProfileCompletedEmail({
            to: updated.user.email,
            fullName:
              updated.user.userProfile?.fullName || updated.displayName,
            accountType: accountLabel,
          })
          .catch((err) => {
            console.warn(
              '[EmailService] Provider verification email failed:',
              err.message
            );
          });
      }

      return res.status(200).json({
        status: 'success',
        message: `Provider verification status updated to ${status}.`,
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
   * List all platform users with pagination, filtering, sorting, and tab counts
   * GET /api/admin/users
   */
  async getUsers(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const skip = (page - 1) * limit;

      const { role, status, userType, search, sort, excludeRole } = req.query;

      const baseWhere = {};
      if (role) {
        baseWhere.role = role;
        if (role === 'USER') {
          baseWhere.providerProfile = { is: null };
        }
      } else if (excludeRole) {
        baseWhere.role = { not: excludeRole };
      }

      const where = { ...baseWhere };
      if (status) where.status = status;
      if (userType) {
        where.userProfile = { is: { userType } };
      }
      if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
          { email: { contains: term } },
          { contactNumber: { contains: term } },
          { userProfile: { is: { fullName: { contains: term } } } },
        ];
      }

      let orderBy = { createdAt: 'desc' };
      if (sort === 'oldest') {
        orderBy = { createdAt: 'asc' };
      } else if (sort === 'name_asc') {
        orderBy = { userProfile: { fullName: 'asc' } };
      }

      const [
        users,
        totalCount,
        allCount,
        studentCount,
        externalCount,
        suspendedCount,
      ] = await Promise.all([
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
          orderBy,
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: baseWhere }),
        prisma.user.count({
          where: { ...baseWhere, userProfile: { is: { userType: 'STUDENT' } } },
        }),
        prisma.user.count({
          where: { ...baseWhere, userProfile: { is: { userType: 'EXTERNAL' } } },
        }),
        prisma.user.count({
          where: { ...baseWhere, status: 'SUSPENDED' },
        }),
      ]);

      return res.status(200).json({
        status: 'success',
        results: users.length,
        total: totalCount,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        counts: {
          all: allCount,
          students: studentCount,
          external: externalCount,
          suspended: suspendedCount,
        },
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
   * Fetch detailed single user record for Admin User Details inspection
   * GET /api/admin/users/:id
   */
  async getUserById(req, res) {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      if (!targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          contactNumber: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          userProfile: true,
          providerProfile: true,
          _count: {
            select: {
              bookings: true,
              reviews: true,
              filedReports: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching user details.',
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

      const existing = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
      });

      if (!existing) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found.',
        });
      }

      if (existing.role === 'ADMIN' && status !== 'ACTIVE') {
        return res.status(403).json({
          status: 'error',
          message: 'Administrator accounts cannot be suspended or deactivated here.',
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
   * Bulk update status for selected non-admin users
   * PATCH /api/admin/users/bulk-status
   */
  async bulkUpdateUserStatus(req, res) {
    try {
      const { ids, status } = req.body || {};

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Please select at least one user.',
        });
      }

      if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Status must be ACTIVE, SUSPENDED, or DEACTIVATED.',
        });
      }

      const numericIds = ids
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isInteger(id) && id > 0 && id !== req.user?.id);

      if (numericIds.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No valid target user IDs provided.',
        });
      }

      const result = await prisma.user.updateMany({
        where: {
          id: { in: numericIds },
          role: { not: 'ADMIN' },
        },
        data: { status },
      });

      return res.status(200).json({
        status: 'success',
        message: `Updated ${result.count} user(s) to ${status}.`,
        data: { updatedCount: result.count },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error during bulk status update.',
      });
    }
  }

  /**
   * Delete a non-admin user account
   * DELETE /api/admin/users/:id
   */
  async deleteUser(req, res) {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      if (!targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID.',
        });
      }

      const existing = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
      });

      if (!existing) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found.',
        });
      }

      if (existing.role === 'ADMIN' || existing.id === req.user?.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Administrator accounts cannot be deleted.',
        });
      }

      await prisma.user.delete({ where: { id: targetUserId } });

      return res.status(200).json({
        status: 'success',
        message: 'User account deleted successfully.',
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while deleting user.',
      });
    }
  }

  /**
   * Bulk delete selected non-admin user accounts
   * POST /api/admin/users/bulk-delete
   */
  async bulkDeleteUsers(req, res) {
    try {
      const { ids } = req.body || {};

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Please select at least one user to delete.',
        });
      }

      const numericIds = ids
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isInteger(id) && id > 0 && id !== req.user?.id);

      if (numericIds.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No valid non-admin user IDs provided.',
        });
      }

      const result = await prisma.user.deleteMany({
        where: {
          id: { in: numericIds },
          role: { not: 'ADMIN' },
        },
      });

      return res.status(200).json({
        status: 'success',
        message: `Deleted ${result.count} user account(s).`,
        data: { deletedCount: result.count },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error during bulk delete.',
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

