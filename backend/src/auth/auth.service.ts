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
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import type { User } from '../../generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const { email, username, password } = registerDto;

    // Validate password strength
    PasswordValidationUtil.validatePasswordStrength(password);

    // Check if user already exists
    const existingUser = await this.databaseService.user.findFirst({
      where: {
        OR: [{ email }, { username }],
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate email confirmation token
    const emailConfirmationToken = randomBytes(32).toString('hex');
    const emailConfirmationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await this.databaseService.user.create({
      data: {
        email,
        username,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: hashedPassword,
        role: 'CUSTOMER',
        isActive: true,
        emailConfirmed: false,
        passwordResetToken: emailConfirmationToken, // Reuse this field for email confirmation
        passwordResetExpires: emailConfirmationExpires,
      },
    });

    // Send email confirmation
    try {
      await this.emailService.sendEmailConfirmation(
        email,
        username,
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
    const { identifier, password } = loginDto;

    // Find user by email or username
    const user = await this.databaseService.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.username,
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Send password changed notification
    try {
      await this.emailService.sendPasswordChangedNotification(
        user.email,
        user.username,
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
}
