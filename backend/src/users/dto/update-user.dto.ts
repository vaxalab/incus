import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  email?: string;
  username?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}
