import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

class AuthService {
  /**
   * Authenticate a user with email and password
   * @param {Object} credentials - { email, password }
   * @returns {Object} { token, user }
   */
  async login({ email, password }) {
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        userProfile: true,
        providerProfile: true,
      },
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      const error = new Error('Your account has been suspended. Please contact support.');
      error.statusCode = 403;
      throw error;
    }

    if (user.status === 'DEACTIVATED') {
      const error = new Error('This account has been deactivated.');
      error.statusCode = 403;
      throw error;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'unimart_default_jwt_secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn }
    );

    // Omit sensitive data
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }
}

export default new AuthService();
