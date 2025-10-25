import { UserRole } from '../../../generated/prisma';

export class CreateUserDto {
  email: string;
  username: string;
  fullName: string;
  password: string;
  role?: UserRole;
}
