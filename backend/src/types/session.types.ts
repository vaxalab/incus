import 'express-session';
import type { User } from '../../generated/prisma';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Express Request augmentation - namespace syntax is required for this pattern
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'password'>;
    }
  }
}
