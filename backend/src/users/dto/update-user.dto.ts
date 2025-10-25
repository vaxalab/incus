enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export class UpdateUserDto {
  email?: string;
  username?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}
