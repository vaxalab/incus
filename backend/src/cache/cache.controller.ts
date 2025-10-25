import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CacheService } from './cache.service';

@Controller('cache')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('health')
  async getHealth() {
    const isHealthy = await this.cacheService.isHealthy();
    const stats = await this.cacheService.getStats();

    return {
      healthy: isHealthy,
      ...stats,
    };
  }

  @Get('stats')
  async getStats() {
    return this.cacheService.getStats();
  }
}
