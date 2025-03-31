// src/modules/auth/services/email.service.ts

import { createContextLogger } from "../../../config/logger";
import nodemailer from "nodemailer";
import { ENV } from "../../../config/env";

const emailLogger = createContextLogger("AuthEmailService");

/**
 * Email service for authentication-related notifications
 */
export class AuthEmailService {
  private static getTransporter() {
    // For production, use actual SMTP settings
    if (ENV.NODE_ENV === "production") {
      return nodemailer.createTransport({
        host: ENV.SMTP_HOST,
        port: ENV.SMTP_PORT,
        secure: ENV.SMTP_SECURE,
        auth: {
          user: ENV.SMTP_USER,
          pass: ENV.SMTP_PASSWORD,
        },
      });
    }
    
    // For development/testing, use ethereal.email
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: ENV.DEV_EMAIL_USER || "ethereal.user@ethereal.email",
        pass: ENV.DEV_EMAIL_PASS || "ethereal_pass",
      },
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: ENV.EMAIL_FROM || '"EasyData Support" <support@easydata.com>',
        to,
        subject: "EasyData - Password Reset",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4a90e2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>This link will expire in 15 minutes for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            <p>Thank you,<br>The EasyData Team</p>
          </div>
        `,
      };
      
      const info = await transporter.sendMail(mailOptions);
      emailLogger.info(`Password reset email sent to ${to}: ${info.messageId}`);
      
      // For development, log preview URL
      if (ENV.NODE_ENV !== "production" && info.messageId) {
        emailLogger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      
      return true;
    } catch (error) {
      emailLogger.error(`Failed to send password reset email: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Send account verification email
   */
  static async sendVerificationEmail(to: string, verificationUrl: string): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: ENV.EMAIL_FROM || '"EasyData Support" <support@easydata.com>',
        to,
        subject: "EasyData - Verify Your Account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for registering with EasyData. Please click the button below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4a90e2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
            </div>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, please ignore this email or contact support if you have concerns.</p>
            <p>Thank you,<br>The EasyData Team</p>
          </div>
        `,
      };
      
      const info = await transporter.sendMail(mailOptions);
      emailLogger.info(`Verification email sent to ${to}: ${info.messageId}`);
      
      // For development, log preview URL
      if (ENV.NODE_ENV !== "production" && info.messageId) {
        emailLogger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      
      return true;
    } catch (error) {
      emailLogger.error(`Failed to send verification email: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Send security alert email
   */
  static async sendSecurityAlertEmail(to: string, alertType: string, details: any): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: ENV.EMAIL_FROM || '"EasyData Security" <security@easydata.com>',
        to,
        subject: `EasyData - Security Alert: ${alertType}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Security Alert</h2>
            <p>We've detected a security event on your EasyData account:</p>
            <div style="background-color: #f8f8f8; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
              <p><strong>Alert Type:</strong> ${alertType}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>IP Address:</strong> ${details.ip || 'Unknown'}</p>
              <p><strong>Location:</strong> ${details.location || 'Unknown'}</p>
            </div>
            <p>If this was you, you can ignore this email. If you didn't perform this action, please secure your account immediately:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ENV.FRONTEND_URL || 'http://localhost:3000'}/security" style="background-color: #e74c3c; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Secure Account</a>
            </div>
            <p>Thank you,<br>The EasyData Security Team</p>
          </div>
        `,
      };
      
      const info = await transporter.sendMail(mailOptions);
      emailLogger.info(`Security alert email sent to ${to}: ${info.messageId}`);
      
      return true;
    } catch (error) {
      emailLogger.error(`Failed to send security alert email: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: ENV.EMAIL_FROM || '"EasyData Support" <support@easydata.com>',
        to,
        subject: "Welcome to EasyData!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to EasyData!</h2>
            <p>Hi ${username},</p>
            <p>Thank you for creating an account with EasyData. We're excited to have you on board!</p>
            <p>With EasyData, you can:</p>
            <ul>
              <li>Connect to multiple databases seamlessly</li>
              <li>Query your data using natural language</li>
              <li>Create visualizations with a few clicks</li>
              <li>Share insights with your team</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ENV.FRONTEND_URL || 'http://localhost:3000'}/getting-started" style="background-color: #4a90e2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Get Started</a>
            </div>
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            <p>Best regards,<br>The EasyData Team</p>
          </div>
        `,
      };
      
      const info = await transporter.sendMail(mailOptions);
      emailLogger.info(`Welcome email sent to ${to}: ${info.messageId}`);
      
      // For development, log preview URL
      if (ENV.NODE_ENV !== "production" && info.messageId) {
        emailLogger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      
      return true;
    } catch (error) {
      emailLogger.error(`Failed to send welcome email: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Send password changed confirmation
   */
  static async sendPasswordChangedEmail(to: string): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: ENV.EMAIL_FROM || '"EasyData Security" <security@easydata.com>',
        to,
        subject: "EasyData - Password Changed",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Changed</h2>
            <p>Your EasyData account password was recently changed.</p>
            <p>This change was made on ${new Date().toLocaleString()}.</p>
            <p>If you did not make this change, please contact our support team immediately:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ENV.FRONTEND_URL || 'http://localhost:3000'}/contact" style="background-color: #e74c3c; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Contact Support</a>
            </div>
            <p>Thank you,<br>The EasyData Security Team</p>
          </div>
        `,
      };
      
      const info = await transporter.sendMail(mailOptions);
      emailLogger.info(`Password changed email sent to ${to}: ${info.messageId}`);
      
      return true;
    } catch (error) {
      emailLogger.error(`Failed to send password changed email: ${(error as Error).message}`);
      return false;
    }
  }
}