import { UserRole } from '@prisma/client';

export class CreateUserDto {
  email: string;
  username: string;
  fullName: string;
  password: string;
  role?: UserRole;
}
