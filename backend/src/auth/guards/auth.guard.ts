import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import '../../types/session.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: any }>();

    // Check if user ID exists in session
    const userId = request.session?.userId;

    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Validate user still exists and is active
    const user = await this.authService.validateUser(userId);

    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    // Attach user to request for use in controllers
    request.user = user;

    return true;
  }
}
