import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { StorageService } from '../storage/storage.service';
import { PasswordValidationUtil } from '../utils/password-validation.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Validate password strength
    PasswordValidationUtil.validatePasswordStrength(createUserDto.password);

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
      const displayName = user.firstName || user.username;
      await this.emailService.sendPasswordChangedNotification(
        user.email,
        displayName,
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
      const displayName = user.firstName || user.username;
      await this.emailService.sendPasswordChangedNotification(
        user.email,
        displayName,
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
      const displayName = user.firstName || user.username;
      await this.emailService.sendWelcomeEmail(user.email, displayName);
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

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      include: { profileImage: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete existing profile image if it exists
    if (user.profileImage) {
      try {
        await this.storageService.deleteFile(
          user.profileImage.bucketName,
          user.profileImage.key,
        );
        // Delete from database
        await this.databaseService.image.delete({
          where: { id: user.profileImage.id },
        });
      } catch (error) {
        console.error('Error deleting existing profile image:', error);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new profile image
    const uploadResult = await this.storageService.uploadImage(file, {
      maxWidth: 500,
      maxHeight: 500,
      quality: 85,
    });

    // Update user with new profile image
    const updatedUser = await this.databaseService.user.update({
      where: { id: userId },
      data: {
        profileImageId: uploadResult.id,
      },
      include: {
        profileImage: true,
      },
    });

    return updatedUser;
  }

  async removeProfileImage(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      include: { profileImage: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profileImage) {
      throw new NotFoundException('User does not have a profile image');
    }

    // Delete image from storage
    try {
      await this.storageService.deleteFile(
        user.profileImage.bucketName,
        user.profileImage.key,
      );
    } catch (error) {
      console.error('Error deleting profile image from storage:', error);
    }

    // Delete image from database
    await this.databaseService.image.delete({
      where: { id: user.profileImage.id },
    });

    // Update user to remove profile image reference
    const updatedUser = await this.databaseService.user.update({
      where: { id: userId },
      data: {
        profileImageId: null,
      },
    });

    return updatedUser;
  }
}
