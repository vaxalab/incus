import 'express-session';
import type { User } from '@prisma/client';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Express Request augmentation
declare module 'express-serve-static-core' {
  interface Request {
    user?: Omit<User, 'password'>;
  }
}
