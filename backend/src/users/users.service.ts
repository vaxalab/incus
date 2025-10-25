import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { PasswordValidationUtil } from '../utils/password-validation.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.databaseService.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or username already exists',
      );
    }

    // Hash password
    const hashedPassword = (await bcrypt.hash(
      createUserDto.password,
      12,
    )) as string;

    // Create user
    const user = await this.databaseService.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailConfirmed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.databaseService.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailConfirmed: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.databaseService.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailConfirmed: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          select: {
            id: true,
            label: true,
            firstName: true,
            lastName: true,
            addressLine1: true,
            city: true,
            postcode: true,
            country: true,
            isDefault: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findByEmail(email: string) {
    return this.databaseService.user.findUnique({
      where: { email },
    });
  }

  findByUsername(username: string) {
    return this.databaseService.user.findUnique({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for conflicts if updating email or username
    if (updateUserDto.email || updateUserDto.username) {
      const existingUser = await this.databaseService.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateUserDto.email ? { email: updateUserDto.email } : {},
                updateUserDto.username
                  ? { username: updateUserDto.username }
                  : {},
              ].filter((condition) => Object.keys(condition).length > 0),
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException(
          'User with this email or username already exists',
        );
      }
    }

    const updatedUser = await this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailConfirmed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    // Validate password strength
    PasswordValidationUtil.validatePasswordStrength(newPassword);

    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new ConflictException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.databaseService.user.update({
      where: { id },
      data: {
        password: hashedNewPassword,
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

    return { message: 'Password changed successfully' };
  }

  async adminChangePassword(id: string, newPassword: string) {
    // Validate password strength
    PasswordValidationUtil.validatePasswordStrength(newPassword);

    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.databaseService.user.update({
      where: { id },
      data: {
        password: hashedNewPassword,
        // Clear any existing password reset tokens
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

    return { message: 'Password changed successfully by admin' };
  }

  async confirmEmail(id: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.databaseService.user.update({
      where: { id },
      data: {
        emailConfirmed: true,
        passwordResetToken: null, // Clear confirmation token
        passwordResetExpires: null,
      },
    });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.username);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return { message: 'Email confirmed successfully' };
  }

  async deactivate(id: string) {
    const user = await this.databaseService.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
      },
    });

    return user;
  }

  async activate(id: string) {
    const user = await this.databaseService.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
      },
    });

    return user;
  }

  async remove(id: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.databaseService.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
