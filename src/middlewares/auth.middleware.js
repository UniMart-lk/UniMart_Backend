import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

/**
 * Middleware to authenticate JWT token from Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'unimart_default_jwt_secret';

    const decoded = jwt.verify(token, jwtSecret);

    // Fetch user to ensure user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token: User no longer exists.',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        status: 'error',
        message: `Account is ${user.status.toLowerCase()}. Access denied.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired. Please login again.',
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Invalid or malformed token.',
    });
  }
};

/**
 * Middleware to authorize specific user roles
 * @param  {...string} roles - Allowed roles (e.g., 'ADMIN', 'PROVIDER', 'USER')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You do not have permission to access this resource.',
      });
    }
    next();
  };
};
