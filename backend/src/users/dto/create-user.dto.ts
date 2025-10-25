enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
  email: string;
  username: string;
  fullName: string;
  password: string;
  role?: UserRole;
}
