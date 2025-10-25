import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { EmailModule } from '../email/email.module';

@Global()
@Module({
  imports: [EmailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, OptionalAuthGuard],
  exports: [AuthService, AuthGuard, RolesGuard, OptionalAuthGuard],
})
export class AuthModule {}
