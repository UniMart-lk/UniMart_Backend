import prisma from '../config/prisma.js';
import authService from '../services/auth.service.js';

class UserController {
  /**
   * Get authenticated user's profile
   * GET /api/users/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userProfile: true,
          providerProfile: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User profile not found.',
        });
      }

      const { passwordHash, ...userWithoutPassword } = user;

      return res.status(200).json({
        status: 'success',
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error while fetching profile.',
      });
    }
  }

  /**
   * Update authenticated user's profile details & set isCompleted = true
   * PUT /api/users/profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const result = await authService.updateProfile(userId, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully.',
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Internal server error while updating profile.',
      });
    }
  }

  /**
   * Get public profile details of a user
   * GET /api/users/:id
   */
  async getUserById(req, res) {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          role: true,
          status: true,
          createdAt: true,
          userProfile: {
            select: {
              fullName: true,
              userType: true,
              university: true,
              faculty: true,
              profilePictureUrl: true,
              isCompleted: true,
            },
          },
          providerProfile: {
            select: {
              id: true,
              providerType: true,
              displayName: true,
              description: true,
              overallRating: true,
              totalReviews: true,
              verificationStatus: true,
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
        message: error.message || 'Internal server error while fetching user.',
      });
    }
  }
}

export default new UserController();

