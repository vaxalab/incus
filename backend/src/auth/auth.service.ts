import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { PasswordValidationUtil } from '../utils/password-validation.util';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import type { PrismaClient } from '@prisma/client';

type User = NonNullable<
  Awaited<ReturnType<PrismaClient['user']['findUnique']>>
>;

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private emailService: EmailService,
  ) {}

  async registerUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    username?: string,
  ): Promise<Omit<User, 'password'>> {
    // Validate password strength
    PasswordValidationUtil.validatePasswordStrength(password);

    // Generate username if not provided
    const generatedUsername =
      username || (await this.generateUsername(email, firstName, lastName));

    // Check if user already exists
    const existingUser = await this.databaseService.user.findFirst({
      where: {
        OR: [{ email }, { username: generatedUsername }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        existingUser.email === email
          ? 'Email already registered'
          : 'Username already taken',
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate email confirmation token
    const emailConfirmationToken = randomBytes(32).toString('hex');
    const emailConfirmationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await this.databaseService.user.create({
      data: {
        email,
        username: generatedUsername,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'CUSTOMER',
        isActive: true,
        emailConfirmed: false,
        passwordResetToken: emailConfirmationToken, // Reuse this field for email confirmation
        passwordResetExpires: emailConfirmationExpires,
      },
    });

    // Send email confirmation
    try {
      const displayName = firstName || generatedUsername;
      await this.emailService.sendEmailConfirmation(
        email,
        displayName,
        emailConfirmationToken,
      );
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send confirmation email:', error);
    }

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto): Promise<Omit<User, 'password'>> {
    const { identifier, email, username, password } = loginDto;

    // Determine the actual identifier to use
    const actualIdentifier = identifier || email || username;

    if (!actualIdentifier) {
      throw new BadRequestException(
        'Email, username, or identifier is required',
      );
    }

    // Find user by email or username
    const user = await this.databaseService.user.findFirst({
      where: {
        OR: [{ email: actualIdentifier }, { username: actualIdentifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Invalidate all existing active sessions for this user (single session per user)
    try {
      await this.databaseService.session.updateMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        data: {
          isActive: false,
          logoutAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      // Don't fail login if session cleanup fails
      console.warn('Failed to cleanup old sessions during login:', error);
    }

    // Update last login timestamp would go here if we had that field
    // await this.databaseService.user.update({
    //   where: { id: user.id },
    //   data: { lastLogin: new Date() },
    // });

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<string> {
    const { email } = forgotPasswordDto;

    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return 'If an account with that email exists, a password reset email has been sent.';
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send password reset email
    try {
      const displayName = user.firstName || user.username;
      await this.emailService.sendPasswordResetEmail(
        user.email,
        displayName,
        resetToken,
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return 'If an account with that email exists, a password reset email has been sent.';
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<string> {
    const { token, newPassword } = resetPasswordDto;

    // Validate password strength
    PasswordValidationUtil.validatePasswordStrength(newPassword);

    const user = await this.databaseService.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Send password changed notification
    try {
      const displayName = user.firstName || user.username;
      await this.emailService.sendPasswordChangedNotification(
        user.email,
        displayName,
      );
    } catch (error) {
      console.error('Failed to send password changed notification:', error);
    }

    return 'Password has been reset successfully';
  }

  async validateUser(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async generateUsername(
    email: string,
    firstName?: string,
    lastName?: string,
  ): Promise<string> {
    // Base username from email or names
    let baseUsername = '';

    if (firstName && lastName) {
      baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    } else if (firstName) {
      baseUsername = firstName.toLowerCase();
    } else {
      // Use part before @ in email
      baseUsername = email.split('@')[0].toLowerCase();
    }

    // Remove non-alphanumeric characters and ensure minimum length
    baseUsername = baseUsername.replace(/[^a-z0-9]/g, '');
    if (baseUsername.length < 3) {
      baseUsername = email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    }

    // Ensure it's still valid
    if (baseUsername.length < 3) {
      baseUsername = 'user';
    }

    // Check if username exists and add numbers if needed
    let username = baseUsername;
    let counter = 1;

    while (await this.usernameExists(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  private async usernameExists(username: string): Promise<boolean> {
    const existingUser = await this.databaseService.user.findUnique({
      where: { username },
    });
    return !!existingUser;
  }

  async confirmEmail(token: string): Promise<string> {
    const user = await this.databaseService.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        emailConfirmed: true,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Send welcome email
    try {
      const displayName = user.firstName || user.username;
      await this.emailService.sendWelcomeEmail(user.email, displayName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return 'Email confirmed successfully';
  }
}
