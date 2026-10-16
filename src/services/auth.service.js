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

  /**
   * Register a new user (Buyer/Renter or Provider)
   * @param {Object} data - { email, password, contactNumber, role, providerType, verificationData }
   * @returns {Object} { token, user }
   */
  async register({ email, password, contactNumber, role = 'USER', providerType, verificationData }) {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      throw error;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedContact = contactNumber ? contactNumber.trim() : null;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const isProvider = role === 'PROVIDER' || role === 'provider';
    const userRole = isProvider ? 'PROVIDER' : 'USER';

    let createdUser;

    if (isProvider) {
      const isStudent =
        providerType === 'STUDENT_PROVIDER' ||
        providerType === 'Student Provider';

      const actualProviderType = isStudent ? 'STUDENT_PROVIDER' : 'EXTERNAL_PROVIDER';
      const actualUserType = isStudent ? 'STUDENT' : 'EXTERNAL';

      const displayName = isStudent
        ? (verificationData?.fullName || trimmedEmail.split('@')[0])
        : (verificationData?.businessName || verificationData?.fullName || trimmedEmail.split('@')[0]);

      createdUser = await prisma.user.create({
        data: {
          email: trimmedEmail,
          passwordHash,
          contactNumber: trimmedContact,
          role: userRole,
          status: 'ACTIVE',
          userProfile: {
            create: {
              fullName: verificationData?.fullName || displayName,
              contactNumber: isStudent ? trimmedContact : (verificationData?.businessContact || trimmedContact),
              userType: actualUserType,
              university: verificationData?.university || null,
              faculty: isStudent ? (verificationData?.faculty || null) : null,
              universityEmail: isStudent ? (verificationData?.universityEmail || null) : null,
              universityIdNumber: isStudent ? (verificationData?.studentId || null) : null,
              nicNumber: !isStudent ? (verificationData?.identificationNumber || null) : null,
              isCompleted: true,
            },
          },
          providerProfile: {
            create: {
              providerType: actualProviderType,
              displayName: displayName,
              description: !isStudent ? (verificationData?.businessAddress || null) : null,
              verificationStatus: 'PENDING',
            },
          },
        },
        include: {
          userProfile: true,
          providerProfile: true,
        },
      });
    } else {
      // Regular User (Buyer & Renter)
      createdUser = await prisma.user.create({
        data: {
          email: trimmedEmail,
          passwordHash,
          contactNumber: trimmedContact,
          role: 'USER',
          status: 'ACTIVE',
          userProfile: {
            create: {
              fullName: trimmedEmail.split('@')[0],
              contactNumber: trimmedContact,
              isCompleted: false,
            },
          },
        },
        include: {
          userProfile: true,
          providerProfile: true,
        },
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'unimart_default_jwt_secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
      },
      jwtSecret,
      { expiresIn }
    );

    const { passwordHash: _, ...userWithoutPassword } = createdUser;

    return {
      token,
      user: userWithoutPassword,
    };
  }
}

export default new AuthService();
