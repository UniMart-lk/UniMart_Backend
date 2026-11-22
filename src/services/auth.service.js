import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import emailService from './email.service.js';

class AuthService {
  /**
   * Authenticate a user with email and password
   * @param {Object} credentials - { email, password, requiredRole }
   * @returns {Object} { token, user }
   */
  async login({ email, password, requiredRole = null }) {
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

    // Enforce role check when logging in through restricted portals (e.g., Admin Panel)
    if (requiredRole && user.role !== requiredRole) {
      const error = new Error('Access denied. Admin access is restricted to authorized personnel only.');
      error.statusCode = 403;
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
   * Send a 6-digit email verification OTP before registration
   * @param {string} email
   */
  async sendVerificationOtp(email) {
    if (!email) {
      const error = new Error('Email address is required.');
      error.statusCode = 400;
      throw error;
    }

    const trimmedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    emailVerificationStore.set(trimmedEmail, {
      code: otpCode,
      expiresAt,
    });

    try {
      await emailService.sendOtpEmail({
        to: trimmedEmail,
        otpCode,
        purpose: 'Email Verification',
      });
    } catch (err) {
      console.error('[EmailService] Failed to send verification OTP:', err.message);
      const error = new Error('Failed to send verification email. Please check the email address and try again.');
      error.statusCode = 502;
      throw error;
    }

    return {
      message: 'Verification code sent to your email address.',
      email: trimmedEmail,
      expiresIn: 600,
    };
  }

  /**
   * Register a new user (Buyer/Renter or Provider)
   * @param {Object} data - { email, password, contactNumber, role, providerType, verificationData, otpCode }
   * @returns {Object} { token, user }
   */
  async register({ email, password, contactNumber, role = 'USER', providerType, verificationData, otpCode }) {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      throw error;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedContact = contactNumber ? contactNumber.trim() : null;

    // If an OTP verification session exists or otpCode was submitted, verify it
    let isEmailVerified = false;
    if (otpCode) {
      const record = emailVerificationStore.get(trimmedEmail);
      if (!record) {
        const error = new Error('Verification code expired or not requested. Please request a new code.');
        error.statusCode = 400;
        throw error;
      }
      if (Date.now() > record.expiresAt) {
        emailVerificationStore.delete(trimmedEmail);
        const error = new Error('Verification code has expired. Please request a new code.');
        error.statusCode = 400;
        throw error;
      }
      if (record.code !== otpCode.toString().trim()) {
        const error = new Error('Invalid verification code. Please check your email and try again.');
        error.statusCode = 400;
        throw error;
      }
      emailVerificationStore.delete(trimmedEmail);
      isEmailVerified = true;
    }

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
      const normalizedProvType = String(providerType || '').trim().toLowerCase();
      const isStudent = normalizedProvType.includes('student');

      const actualProviderType = isStudent ? 'STUDENT_PROVIDER' : 'EXTERNAL_PROVIDER';
      const actualUserType = isStudent ? 'STUDENT' : 'EXTERNAL';

      const displayName = isStudent
        ? (verificationData?.fullName || trimmedEmail.split('@')[0])
        : (verificationData?.businessName || verificationData?.fullName || trimmedEmail.split('@')[0]);

      const studentPrivacySettings =
        isStudent && (verificationData?.department || verificationData?.intakeBatch)
          ? {
              department: verificationData.department || null,
              intakeBatch: verificationData.intakeBatch || null,
            }
          : undefined;

      createdUser = await prisma.user.create({
        data: {
          email: trimmedEmail,
          passwordHash,
          contactNumber: trimmedContact,
          role: userRole,
          status: 'ACTIVE',
          emailVerified: isEmailVerified,
          userProfile: {
            create: {
              fullName: verificationData?.fullName || displayName,
              contactNumber: isStudent ? trimmedContact : (verificationData?.businessContact || trimmedContact),
              userType: actualUserType,
              university: isStudent ? (verificationData?.university || null) : null,
              faculty: isStudent ? (verificationData?.faculty || null) : null,
              universityEmail: isStudent ? (verificationData?.universityEmail || trimmedEmail) : null,
              universityIdNumber: isStudent ? (verificationData?.studentId || null) : null,
              nicNumber: !isStudent ? (verificationData?.identificationNumber || null) : null,
              isCompleted: false,
              privacySettings: studentPrivacySettings,
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
      const buyerPrivacySettings =
        verificationData?.department || verificationData?.intakeBatch
          ? {
              department: verificationData.department || null,
              intakeBatch: verificationData.intakeBatch || null,
            }
          : undefined;

      createdUser = await prisma.user.create({
        data: {
          email: trimmedEmail,
          passwordHash,
          contactNumber: trimmedContact,
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: isEmailVerified,
          userProfile: {
            create: {
              fullName: verificationData?.fullName || trimmedEmail.split('@')[0],
              contactNumber: trimmedContact,
              userType: 'STUDENT',
              university: verificationData?.university || null,
              faculty: verificationData?.faculty || null,
              universityEmail: verificationData?.universityEmail || trimmedEmail,
              universityIdNumber: verificationData?.studentId || null,
              isCompleted: false,
              privacySettings: buyerPrivacySettings,
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

    // Send welcome email asynchronously (never blocks registration response)
    emailService
      .sendWelcomeEmail({
        to: createdUser.email,
        fullName: createdUser.userProfile?.fullName,
        role: createdUser.role,
      })
      .catch((err) => {
        console.warn('[EmailService] Welcome email failed:', err.message);
      });

    return {
      token,
      user: userWithoutPassword,
    };
  }

  /**
   * Request password reset code
   * @param {string} email
   * @returns {Object} { message, expiresIn, devCode }
   */
  async requestPasswordReset(email) {
    if (!email) {
      const error = new Error('Email address is required.');
      error.statusCode = 400;
      throw error;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      const error = new Error('No account found with this email address.');
      error.statusCode = 404;
      throw error;
    }

    if (user.status === 'SUSPENDED') {
      const error = new Error('This account has been suspended. Please contact support.');
      error.statusCode = 403;
      throw error;
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in memory map
    resetCodeStore.set(trimmedEmail, {
      code: otpCode,
      expiresAt,
      isVerified: false,
    });

    try {
      await emailService.sendOtpEmail({
        to: trimmedEmail,
        otpCode,
        purpose: 'Password Reset',
      });
    } catch (err) {
      console.error('[EmailService] Failed to send password reset email:', err.message);
      const error = new Error('Failed to send password reset email. Please try again.');
      error.statusCode = 502;
      throw error;
    }

    return {
      message: 'We have sent a 6-digit verification code to your email address.',
      email: trimmedEmail,
      expiresIn: 600,
    };
  }

  /**
   * Verify 6-digit OTP code
   * @param {string} email
   * @param {string} code
   * @returns {Object} { message, resetToken }
   */
  async verifyResetCode(email, code) {
    if (!email || !code) {
      const error = new Error('Email and verification code are required.');
      error.statusCode = 400;
      throw error;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.toString().trim();

    const record = resetCodeStore.get(trimmedEmail);

    if (!record) {
      const error = new Error('No password reset request found. Please request a new code.');
      error.statusCode = 400;
      throw error;
    }

    if (Date.now() > record.expiresAt) {
      resetCodeStore.delete(trimmedEmail);
      const error = new Error('Verification code has expired. Please request a new code.');
      error.statusCode = 400;
      throw error;
    }

    if (record.code !== trimmedCode) {
      const error = new Error('Invalid verification code. Please check and try again.');
      error.statusCode = 400;
      throw error;
    }

    // Mark as verified and generate temporary resetToken
    record.isVerified = true;
    const resetToken = jwt.sign(
      { email: trimmedEmail, purpose: 'password_reset' },
      process.env.JWT_SECRET || 'unimart_default_jwt_secret',
      { expiresIn: '15m' }
    );
    record.resetToken = resetToken;
    resetCodeStore.set(trimmedEmail, record);

    return {
      message: 'Email verified successfully.',
      resetToken,
    };
  }

  /**
   * Reset user password
   * @param {Object} param - { email, newPassword, resetToken, code }
   * @returns {Object} { message }
   */
  async resetPassword({ email, newPassword, resetToken, code }) {
    if (!email || !newPassword) {
      const error = new Error('Email and new password are required.');
      error.statusCode = 400;
      throw error;
    }

    if (newPassword.length < 8) {
      const error = new Error('Password must be at least 8 characters long.');
      error.statusCode = 400;
      throw error;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const record = resetCodeStore.get(trimmedEmail);

    // Verify authorization to reset password
    let authorized = false;
    if (resetToken) {
      try {
        const decoded = jwt.verify(
          resetToken,
          process.env.JWT_SECRET || 'unimart_default_jwt_secret'
        );
        if (decoded.email === trimmedEmail && decoded.purpose === 'password_reset') {
          authorized = true;
        }
      } catch (err) {
        // Token invalid or expired
      }
    }

    if (!authorized && record && record.isVerified && Date.now() <= record.expiresAt) {
      authorized = true;
    }

    if (!authorized && code && record && record.code === code.trim() && Date.now() <= record.expiresAt) {
      authorized = true;
    }

    if (!authorized) {
      const error = new Error('Unauthorized or expired password reset session. Please start again.');
      error.statusCode = 401;
      throw error;
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      const error = new Error('User account not found.');
      error.statusCode = 404;
      throw error;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update in database
    await prisma.user.update({
      where: { email: trimmedEmail },
      data: { passwordHash },
    });

    // Invalidate reset code from store
    resetCodeStore.delete(trimmedEmail);

    return {
      message: 'Password has been reset successfully. You can now log in.',
    };
  }

  /**
   * Update authenticated user profile details and mark completed
   * @param {number} userId
   * @param {object} profileData
   */
  async updateProfile(userId, profileData) {
    const {
      fullName,
      contactNumber,
      university,
      faculty,
      department,
      intakeBatch,
      studentRegistrationNumber,
      nicNumber,
      profilePictureUrl,
      providerDisplayName,
      serviceArea,
      description,
      businessName,
      studentEvidenceUrl,
      identityEvidenceUrl,
      isProvider,
      providerType,
      badgeType,
    } = profileData || {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userProfile: true, providerProfile: true },
    });

    if (!user) {
      const error = new Error('User account not found.');
      error.statusCode = 404;
      throw error;
    }

    const normalizedProvType = String(providerType || '').trim().toLowerCase();
    const shouldBeProvider =
      Boolean(isProvider) ||
      normalizedProvType.includes('student') ||
      normalizedProvType.includes('external') ||
      user.role === 'PROVIDER' ||
      Boolean(user.providerProfile);

    const isExplicitStudent =
      normalizedProvType.includes('student') ||
      badgeType === 'STUDENT_PROVIDER' ||
      badgeType === 'STUDENT';

    const isExternalType = isExplicitStudent
      ? false
      : normalizedProvType.includes('external') ||
        badgeType === 'EXTERNAL_PROVIDER' ||
        user.providerProfile?.providerType === 'EXTERNAL_PROVIDER' ||
        user.userProfile?.userType === 'EXTERNAL';

    const targetUserType = isExternalType ? 'EXTERNAL' : 'STUDENT';
    const targetProviderType = isExternalType ? 'EXTERNAL_PROVIDER' : 'STUDENT_PROVIDER';

    // 1. Update User record (contactNumber, and role)
    const userUpdateData = {};
    if (contactNumber) userUpdateData.contactNumber = contactNumber.trim();
    if (shouldBeProvider && user.role !== 'PROVIDER') userUpdateData.role = 'PROVIDER';

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // Store custom student & university metadata in privacySettings Json column
    const existingSettings =
      typeof user.userProfile?.privacySettings === 'object' && user.userProfile?.privacySettings !== null
        ? user.userProfile.privacySettings
        : {};

    const docUrl = studentEvidenceUrl || identityEvidenceUrl || existingSettings.studentEvidenceUrl || null;

    const updatedSettings = {
      ...existingSettings,
      studentEvidenceUrl: docUrl,
      department: department || existingSettings.department || null,
      intakeBatch: intakeBatch || existingSettings.intakeBatch || null,
      badgeType: badgeType || (shouldBeProvider ? targetProviderType : 'STUDENT'),
    };

    // 2. Upsert UserProfile in MySQL
    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: fullName || user.email.split('@')[0],
        contactNumber: contactNumber || user.contactNumber || null,
        userType: targetUserType,
        university: isExternalType ? null : (university || null),
        faculty: isExternalType ? null : (faculty || null),
        universityIdNumber: isExternalType ? null : (studentRegistrationNumber || null),
        nicNumber: isExternalType ? (nicNumber || null) : null,
        profilePictureUrl: profilePictureUrl || null,
        isCompleted: true,
        privacySettings: updatedSettings,
      },
      update: {
        fullName: fullName || undefined,
        contactNumber: contactNumber !== undefined ? contactNumber : undefined,
        userType: targetUserType,
        university: isExternalType ? null : (university !== undefined ? university : undefined),
        faculty: isExternalType ? null : (faculty !== undefined ? faculty : undefined),
        universityIdNumber: isExternalType ? null : (studentRegistrationNumber !== undefined ? studentRegistrationNumber : undefined),
        nicNumber: isExternalType ? (nicNumber !== undefined ? nicNumber : undefined) : null,
        profilePictureUrl: profilePictureUrl !== undefined ? profilePictureUrl : undefined,
        isCompleted: true,
        privacySettings: updatedSettings,
      },
    });

    // 3. Update ProviderProfile if provider
    if (shouldBeProvider) {
      const combinedDescription = [
        description,
        serviceArea ? `Service Area: ${serviceArea}` : null,
        businessName ? `Business Name: ${businessName}` : null,
      ].filter(Boolean).join('\n');

      const isAlreadyVerified = user.providerProfile?.verificationStatus === 'VERIFIED';

      await prisma.providerProfile.upsert({
        where: { userId },
        create: {
          userId,
          providerType: targetProviderType,
          displayName: providerDisplayName || fullName || user.email.split('@')[0],
          description: combinedDescription || null,
          verificationDocUrl: docUrl,
          verificationStatus: 'PENDING',
          verifiedAt: null,
        },
        update: {
          providerType: targetProviderType,
          displayName: providerDisplayName || undefined,
          description: combinedDescription || undefined,
          verificationDocUrl: docUrl || undefined,
          verificationStatus: isAlreadyVerified ? 'VERIFIED' : 'PENDING',
          verifiedAt: isAlreadyVerified ? user.providerProfile.verifiedAt : null,
          rejectionReason: isAlreadyVerified ? undefined : null,
        },
      });
    }

    // 4. Fetch the refreshed user from database
    const refreshedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userProfile: true,
        providerProfile: true,
      },
    });

    const { passwordHash, ...userWithoutPassword } = refreshedUser;

    // Attach studentEvidenceUrl on userProfile for immediate frontend consumption
    if (userWithoutPassword.userProfile) {
      userWithoutPassword.userProfile.studentEvidenceUrl =
        docUrl ||
        userWithoutPassword.providerProfile?.verificationDocUrl ||
        userWithoutPassword.userProfile?.privacySettings?.studentEvidenceUrl;
    }

    // Send verification email immediately only for non-provider buyers.
    // Providers receive the "Profile Verified" email after admin approval.
    if (!user.userProfile?.isCompleted && !shouldBeProvider) {
      emailService
        .sendProfileCompletedEmail({
          to: refreshedUser.email,
          fullName: refreshedUser.userProfile?.fullName,
          accountType: 'Student Buyer',
        })
        .catch((err) => {
          console.warn('[EmailService] Profile completion email failed:', err.message);
        });
    }

    return { user: userWithoutPassword };
  }
}

// In-memory stores for email verification & password reset OTP codes
const emailVerificationStore = new Map();
const resetCodeStore = new Map();

export default new AuthService();
