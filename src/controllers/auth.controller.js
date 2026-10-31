import authService from '../services/auth.service.js';

class AuthController {
  /**
   * Handle user login request
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide both email and password.',
        });
      }

      const result = await authService.login({ email, password });

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Internal server error during login',
      });
    }
  }

  /**
   * Handle user registration request
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { email, password, contactNumber, role, providerType, verificationData } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide both email and password.',
        });
      }

      const result = await authService.register({
        email,
        password,
        contactNumber,
        role,
        providerType,
        verificationData,
      });

      return res.status(201).json({
        status: 'success',
        message: 'Account registered successfully',
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Internal server error during registration',
      });
    }
  }

  /**
   * Handle get current authenticated user profile
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      return res.status(200).json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * Request a 6-digit password reset verification code
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body || {};

      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide your registered email address.',
        });
      }

      const result = await authService.requestPasswordReset(email);

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Failed to process password reset request.',
      });
    }
  }

  /**
   * Verify the 6-digit OTP code
   * POST /api/auth/verify-reset-code
   */
  async verifyResetCode(req, res) {
    try {
      const { email, code } = req.body || {};

      if (!email || !code) {
        return res.status(400).json({
          status: 'error',
          message: 'Both email address and 6-digit verification code are required.',
        });
      }

      const result = await authService.verifyResetCode(email, code);

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Verification code is invalid or has expired.',
      });
    }
  }

  /**
   * Set new password using verified session
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { email, newPassword, resetToken, code } = req.body || {};

      if (!email || !newPassword) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and new password are required.',
        });
      }

      const result = await authService.resetPassword({
        email,
        newPassword,
        resetToken,
        code,
      });

      return res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Failed to reset password.',
      });
    }
  }
}

export default new AuthController();
