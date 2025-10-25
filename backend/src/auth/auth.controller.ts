import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Get,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/user.decorator';
import { SessionUtil } from '../utils/session.util';
import { SessionTrackingUtil } from '../utils/session-tracking.util';
import { DatabaseService } from '../database/database.service';
import type { PrismaClient } from '@prisma/client';

type User = NonNullable<
  Awaited<ReturnType<PrismaClient['user']['findUnique']>>
>;
import '../types/session.types';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const user = await this.authService.registerUser(
      registerDto.email,
      registerDto.username,
      registerDto.password,
    );

    // Create session with role-based expiration
    if (req.session) {
      req.session.userId = user.id;
      req.session.cookie.maxAge = SessionUtil.calculateSessionMaxAge(user.role);

      // Track session in database for analytics
      const sessionMetadata = SessionTrackingUtil.extractSessionMetadata(
        req,
        user.role,
      );
      try {
        await this.databaseService.session.create({
          data: {
            sid: req.sessionID,
            userId: user.id,
            ...sessionMetadata,
          },
        });
      } catch (error) {
        // Don't fail registration if session tracking fails
        console.warn('Failed to track session during registration:', error);
      }
    }

    return {
      message: 'Registration successful',
      user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const user = await this.authService.login(loginDto);

    // Create session with role-based expiration
    if (req.session) {
      req.session.userId = user.id;
      req.session.cookie.maxAge = SessionUtil.calculateSessionMaxAge(user.role);

      // Track session in database for analytics
      const sessionMetadata = SessionTrackingUtil.extractSessionMetadata(
        req,
        user.role,
      );
      try {
        await this.databaseService.session.create({
          data: {
            sid: req.sessionID,
            userId: user.id,
            ...sessionMetadata,
          },
        });
      } catch (error) {
        // Don't fail login if session tracking fails
        console.warn('Failed to track session during login:', error);
      }
    }

    return {
      message: 'Login successful',
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request) {
    return new Promise<{ message: string }>((resolve, reject) => {
      if (req.session) {
        // Mark session as logged out in database before destroying Redis session
        void SessionTrackingUtil.markSessionLoggedOut(
          req.sessionID,
          this.databaseService,
        );

        req.session.destroy((err) => {
          if (err) {
            reject(new Error('Could not log out'));
          } else {
            resolve({ message: 'Logout successful' });
          }
        });
      } else {
        resolve({ message: 'Logout successful' });
      }
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: Omit<User, 'password'>) {
    return { user };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const message = await this.authService.forgotPassword(forgotPasswordDto);
    return {
      message,
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const message = await this.authService.resetPassword(resetPasswordDto);
    return {
      message,
    };
  }
}
