import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: any }>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = request.session?.userId;

    if (userId) {
      // Try to attach user if session exists
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const user = await this.authService.validateUser(userId);
        if (user) {
          request.user = user;
        }
      } catch {
        // Silently fail for optional auth
      }
    }

    // Always allow access (user will be null if not authenticated)
    return true;
  }
}
