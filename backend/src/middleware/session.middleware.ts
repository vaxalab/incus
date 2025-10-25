import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);
  private sessionHandler: any;
  private initialized = false;

  constructor(private readonly cacheService: CacheService) {}

  private initializeSession() {
    if (this.initialized) return;

    try {
      const redisClient = this.cacheService.getClient();

      this.sessionHandler = session({
        store: new RedisStore({
          client: redisClient,
        }),
        secret:
          process.env.SESSION_SECRET ||
          'incus-session-secret-change-in-production',
        resave: false,
        saveUninitialized: true, // Allow creation of empty sessions
        name: 'incus.sid',
        rolling: true, // Reset expiration on each request
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 30, // Default 30 days (will be overridden per role)
          sameSite: 'lax',
        },
      });

      this.initialized = true;
      this.logger.log('Session middleware initialized');
    } catch (error) {
      this.logger.error('Failed to initialize session middleware:', error);
      throw error;
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Lazy initialization
    if (!this.initialized) {
      this.initializeSession();
    }

    this.sessionHandler(req, res, (err?: any) => {
      if (err) {
        this.logger.error('Session middleware error:', err);
      } else {
        this.logger.debug(`Session initialized for ${req.method} ${req.path}`, {
          sessionExists: !!req.session,
          sessionId: req.sessionID,
        });
      }
      next(err);
    });
  }
}
