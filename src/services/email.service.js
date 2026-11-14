import nodemailer from 'nodemailer';

/**
 * EmailService handles outbound transactional emails via Nodemailer SMTP.
 */
class EmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Lazily initialize and return the Nodemailer transporter so dotenv values are loaded.
   */
  getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS?.replace(/\s+/g, '');

    if (!user || !pass) {
      return null;
    }

    const port = Number(process.env.EMAIL_PORT) || 465;
    const secure =
      process.env.EMAIL_SECURE !== undefined
        ? process.env.EMAIL_SECURE === 'true'
        : port === 465;

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  /**
   * Verify SMTP authentication and connectivity.
   */
  async verifyConnection() {
    const transporter = this.getTransporter();
    if (!transporter) {
      return { ok: false, reason: 'Email credentials not configured' };
    }
    await transporter.verify();
    return { ok: true };
  }

  /**
   * Send an email via configured SMTP transporter.
   * Skips cleanly during tests or when email sending is explicitly disabled.
   */
  async sendEmail({ to, subject, text, html }) {
    if (
      process.env.DISABLE_EMAIL_SENDING === 'true' ||
      process.env.NODE_ENV === 'test'
    ) {
      return { skipped: true, to, subject };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('[EmailService] EMAIL_USER/EMAIL_PASS not configured; skipping email.');
      return { skipped: true, to, subject };
    }

    const from = process.env.EMAIL_FROM || `UniMart <${process.env.EMAIL_USER}>`;
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return info;
  }

  /**
   * Send a 6-digit OTP verification email (Password Reset or Account Verification).
   */
  async sendOtpEmail({ to, otpCode, purpose = 'Password Reset' }) {
    const subject = `UniMart - Your ${purpose} Code`;
    const text = `Your UniMart ${purpose} verification code is: ${otpCode}. This code is valid for 10 minutes.`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
        <h2 style="margin: 0 0 12px; color: #0F172A; font-size: 20px;">UniMart ${purpose}</h2>
        <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.5;">
          Use the 6-digit verification code below to complete your ${purpose.toLowerCase()} request:
        </p>
        <div style="background-color: #F1F5F9; border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 16px;">
          <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #2563EB;">${otpCode}</span>
        </div>
        <p style="margin: 0; color: #64748B; font-size: 12px;">
          This code expires in 10 minutes. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send a welcome email after account registration.
   */
  async sendWelcomeEmail({ to, fullName, role }) {
    const displayName = fullName || to.split('@')[0];
    const accountLabel = role === 'PROVIDER' ? 'Provider' : 'Student';
    const subject = 'Welcome to UniMart!';
    const text = `Hi ${displayName}, your UniMart ${accountLabel} account has been created successfully. Complete your profile in the app to unlock all features.`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
        <h2 style="margin: 0 0 12px; color: #0F172A; font-size: 20px;">Welcome to UniMart, ${displayName}!</h2>
        <p style="margin: 0 0 14px; color: #475569; font-size: 14px; line-height: 1.5;">
          Your <strong>${accountLabel}</strong> account has been registered successfully.
        </p>
        <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.5;">
          Open the UniMart app and complete your profile details to receive your verified badge and start buying, selling, or renting on campus.
        </p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send confirmation email when a user completes and verifies their profile.
   */
  async sendProfileCompletedEmail({ to, fullName, accountType }) {
    const displayName = fullName || to.split('@')[0];
    const subject = 'UniMart - Your Profile Is Verified';
    const text = `Hi ${displayName}, your ${accountType} profile on UniMart has been completed and verified.`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
        <h2 style="margin: 0 0 12px; color: #059669; font-size: 20px;">Profile Verified</h2>
        <p style="margin: 0 0 14px; color: #475569; font-size: 14px; line-height: 1.5;">
          Hi <strong>${displayName}</strong>, your <strong>${accountType}</strong> profile is now complete and verified on UniMart.
        </p>
        <p style="margin: 0; color: #64748B; font-size: 13px;">
          Your verified badge is now active on your profile.
        </p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }
}

export default new EmailService();

