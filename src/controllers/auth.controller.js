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
}

export default new AuthController();
