import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('API_KEY');
    if (!this.apiKey) {
      this.logger.error('API_KEY not found in environment variables');
      throw new Error('API_KEY must be configured');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedApiKey = this.extractApiKey(request);

    if (!providedApiKey) {
      this.logger.warn(`API key missing for ${request.method} ${request.url}`);
      throw new UnauthorizedException('API key is required');
    }

    if (providedApiKey !== this.apiKey) {
      this.logger.warn(
        `Invalid API key provided for ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    // Check multiple header formats
    return (
      (request.headers['x-api-key'] as string) ||
      (request.headers['api-key'] as string) ||
      request.headers['authorization']?.replace('Bearer ', '') ||
      undefined
    );
  }
}
