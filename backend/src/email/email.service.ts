import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.createTransporter();
  }

  private createTransporter() {
    // MailHog configuration for development
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false, // true for 465, false for other ports
      ignoreTLS: true, // MailHog doesn't use TLS
      auth: false, // MailHog doesn't require authentication
    } as nodemailer.TransportOptions);

    this.logger.log('Email transporter configured for MailHog');
  }

  async sendEmail(emailData: EmailTemplate): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.transporter.sendMail({
        from:
          process.env.SMTP_FROM || '"Incus Records" <noreply@incusrecords.com>',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });

      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Email sent successfully to ${emailData.to}: ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailData.to}:`, error);
      return false;
    }
  }

  async sendEmailConfirmation(
    email: string,
    username: string,
    confirmationToken: string,
  ): Promise<boolean> {
    const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirm-email?token=${confirmationToken}`;

    const emailData: EmailTemplate = {
      to: email,
      subject: 'Welcome to Incus Records - Confirm Your Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Incus Records</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a1a; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #ff6b35; 
              color: #fff; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Incus Records</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Thank you for joining Incus Records. To complete your registration, please confirm your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
              
              <p>This link will expire in 24 hours for security reasons.</p>
              
              <p>If you didn't create an account with us, please ignore this email.</p>
              
              <p>Welcome to our community of music lovers!</p>
              <p><strong>The Incus Records Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Incus Records. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Incus Records!
        
        Hello ${username},
        
        Thank you for joining Incus Records. To complete your registration, please confirm your email address by visiting this link:
        
        ${confirmationUrl}
        
        This link will expire in 24 hours for security reasons.
        
        If you didn't create an account with us, please ignore this email.
        
        Welcome to our community of music lovers!
        
        The Incus Records Team
      `,
    };

    return this.sendEmail(emailData);
  }

  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const emailData: EmailTemplate = {
      to: email,
      subject: 'Incus Records - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset - Incus Records</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a1a; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #ff6b35; 
              color: #fff; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}</h2>
              <p>We received a request to reset your password for your Incus Records account.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <p>To reset your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              
              <p><strong>This link will expire in 1 hour</strong> for security reasons.</p>
              
              <p>If you continue to have problems, please contact our support team.</p>
              
              <p>Best regards,<br><strong>The Incus Records Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Incus Records. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - Incus Records
        
        Hello ${username},
        
        We received a request to reset your password for your Incus Records account.
        
        SECURITY NOTICE: If you didn't request this password reset, please ignore this email and your password will remain unchanged.
        
        To reset your password, visit this link:
        ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you continue to have problems, please contact our support team.
        
        Best regards,
        The Incus Records Team
      `,
    };

    return this.sendEmail(emailData);
  }

  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const emailData: EmailTemplate = {
      to: email,
      subject: 'Welcome to Incus Records - Account Activated!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Incus Records</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a1a; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #ff6b35; 
              color: #fff; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .features { background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 Welcome to Incus Records! 🎵</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Your account has been successfully activated. Welcome to the Incus Records family!</p>
              
              <div class="features">
                <h3>What you can do now:</h3>
                <ul>
                  <li>🎵 Browse our latest releases and artists</li>
                  <li>🛒 Shop for exclusive merchandise and vinyl</li>
                  <li>📱 Download high-quality digital releases</li>
                  <li>📧 Get notified about new releases and events</li>
                  <li>👤 Manage your profile and preferences</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Explore Incus Records</a>
              </div>
              
              <p>Follow us on social media to stay updated with the latest news and releases!</p>
              
              <p>If you have any questions, don't hesitate to contact our support team.</p>
              
              <p>Thank you for joining our community!</p>
              <p><strong>The Incus Records Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Incus Records. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Incus Records!
        
        Hello ${username}!
        
        Your account has been successfully activated. Welcome to the Incus Records family!
        
        What you can do now:
        - Browse our latest releases and artists
        - Shop for exclusive merchandise and vinyl
        - Download high-quality digital releases
        - Get notified about new releases and events
        - Manage your profile and preferences
        
        Visit us at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
        
        Follow us on social media to stay updated with the latest news and releases!
        
        If you have any questions, don't hesitate to contact our support team.
        
        Thank you for joining our community!
        
        The Incus Records Team
      `,
    };

    return this.sendEmail(emailData);
  }

  async sendPasswordChangedNotification(
    email: string,
    username: string,
  ): Promise<boolean> {
    const emailData: EmailTemplate = {
      to: email,
      subject: 'Incus Records - Password Changed Successfully',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Changed - Incus Records</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a1a; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}</h2>
              
              <div class="success">
                <strong>✅ Success:</strong> Your password has been changed successfully.
              </div>
              
              <p>This email confirms that your Incus Records account password was recently changed on ${new Date().toLocaleString()}.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact our support team immediately and consider changing your password again.
              </div>
              
              <p>For your security, please ensure that:</p>
              <ul>
                <li>You keep your password private and secure</li>
                <li>You don't share your account with others</li>
                <li>You log out from shared devices</li>
              </ul>
              
              <p>If you have any concerns about your account security, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br><strong>The Incus Records Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Incus Records. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Changed - Incus Records
        
        Hello ${username},
        
        SUCCESS: Your password has been changed successfully.
        
        This email confirms that your Incus Records account password was recently changed on ${new Date().toLocaleString()}.
        
        SECURITY NOTICE: If you didn't make this change, please contact our support team immediately and consider changing your password again.
        
        For your security, please ensure that:
        - You keep your password private and secure
        - You don't share your account with others
        - You log out from shared devices
        
        If you have any concerns about your account security, please don't hesitate to contact us.
        
        Best regards,
        The Incus Records Team
      `,
    };

    return this.sendEmail(emailData);
  }
}
