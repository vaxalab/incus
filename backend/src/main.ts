import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { AppModule } from './app.module';
import { CacheService } from './cache/cache.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Initialize the app (triggers onModuleInit)
  await app.init();

  // Get Redis client from cache service for session store
  const cacheService = app.get(CacheService);
  const redisClient = cacheService.getClient();

  // Session configuration
  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
      }),
      secret:
        process.env.SESSION_SECRET ||
        'incus-session-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      name: 'incus.sid',
      rolling: true, // Reset expiration on each request
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30, // Default 30 days (will be overridden per role)
        sameSite: 'lax',
      },
    }),
  );

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
