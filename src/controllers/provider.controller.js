import prisma from '../config/prisma.js';
import authService from '../services/auth.service.js';

class ProviderController {
  /**
   * Register a new provider account
   * POST /api/providers/register
   */
  async registerProvider(req, res) {
    try {
      const { email, password, contactNumber, providerType, verificationData } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and password are required.',
        });
      }

      const result = await authService.register({
        email,
        password,
        contactNumber,
        role: 'PROVIDER',
        providerType: providerType || 'STUDENT_PROVIDER',
        verificationData,
      });

      return res.status(201).json({
        status: 'success',
        message: 'Provider registered successfully. Verification is pending.',
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Internal server error during provider registration.',
      });
    }
  }

  /**
   * Submit or update provider verification documents
   * POST /api/providers/verify
   */
  async submitVerification(req, res) {
    try {
      const userId = req.user.id;
      const {
        displayName,
        description,
        serviceArea,
        businessName,
        verificationDocUrl,
        providerType,
      } = req.body || {};

      if (!displayName && !verificationDocUrl) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide display name and verification document URL.',
        });
      }

      const combinedDescription = [
        description,
        serviceArea ? `Service Area: ${serviceArea}` : null,
        businessName ? `Business: ${businessName}` : null,
      ].filter(Boolean).join('\n');

      const updated = await prisma.providerProfile.upsert({
        where: { userId },
        create: {
          userId,
          providerType: providerType || 'STUDENT_PROVIDER',
          displayName: displayName || req.user.email.split('@')[0],
          description: combinedDescription || null,
          verificationDocUrl: verificationDocUrl || null,
          verificationStatus: 'PENDING',
        },
        update: {
          displayName: displayName || undefined,
          description: combinedDescription || undefined,
          verificationDocUrl: verificationDocUrl || undefined,
          verificationStatus: 'PENDING',
          rejectionReason: null,
        },
      });

      return res.status(200).json({
        status: 'success',
        message: 'Provider verification submitted successfully. Status is PENDING review.',
        data: { provider: updated },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while submitting provider verification.',
      });
    }
  }

  /**
   * Get authenticated provider profile details
   * GET /api/providers/profile
   */
  async getMyProviderProfile(req, res) {
    try {
      const userId = req.user.id;

      const provider = await prisma.providerProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              contactNumber: true,
              role: true,
              status: true,
              userProfile: true,
            },
          },
        },
      });

      if (!provider) {
        return res.status(404).json({
          status: 'error',
          message: 'Provider profile not found for this account.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: { provider },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching provider profile.',
      });
    }
  }

  /**
   * Get public provider details by provider ID
   * GET /api/providers/:id
   */
  async getProviderById(req, res) {
    try {
      const providerId = parseInt(req.params.id, 10);
      if (isNaN(providerId)) {
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
              userProfile: {
                select: {
                  fullName: true,
                  profilePictureUrl: true,
                  university: true,
                  faculty: true,
                },
              },
            },
          },
        },
      });

      if (!provider) {
        return res.status(404).json({
          status: 'error',
          message: 'Provider not found.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: { provider },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching provider.',
      });
    }
  }
}

export default new ProviderController();

