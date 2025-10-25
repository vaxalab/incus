import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

type User = NonNullable<
  Awaited<ReturnType<PrismaClient['user']['findUnique']>>
>;
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from '../auth/dto/auth.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMIN')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get('profile')
  @Roles('ADMIN', 'CUSTOMER')
  getProfile(@CurrentUser() user: Omit<User, 'password'>) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  @Roles('ADMIN', 'CUSTOMER')
  updateProfile(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, updateUserDto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post('change-password')
  @Roles('ADMIN', 'CUSTOMER')
  changePassword(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post(':id/change-password')
  @Roles('ADMIN')
  async adminChangePassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    return await this.usersService.adminChangePassword(id, body.newPassword);
  }

  @Post(':id/confirm-email')
  @Roles('ADMIN')
  confirmEmail(@Param('id') id: string) {
    return this.usersService.confirmEmail(id);
  }

  @Post(':id/activate')
  @Roles('ADMIN')
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Post(':id/deactivate')
  @Roles('ADMIN')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
