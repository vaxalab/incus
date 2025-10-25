/**
 * Session utility functions for managing session configuration
 */

import type { UserRole } from '@prisma/client';

export class SessionUtil {
  /**
   * Calculate session expiration time based on user role
   * @param role - User role (ADMIN or CUSTOMER)
   * @returns Session max age in milliseconds
   */
  static calculateSessionMaxAge(role: UserRole): number {
    switch (role) {
      case 'ADMIN':
        return 1000 * 60 * 60 * 24 * 14; // 14 days for admins
      case 'CUSTOMER':
      default:
        return 1000 * 60 * 60 * 24 * 30; // 30 days for customers
    }
  }

  /**
   * Get human-readable session duration for a role
   * @param role - User role
   * @returns Human-readable duration string
   */
  static getSessionDuration(role: UserRole): string {
    switch (role) {
      case 'ADMIN':
        return '14 days';
      case 'CUSTOMER':
      default:
        return '30 days';
    }
  }

  /**
   * Session configuration constants
   */
  static readonly SESSION_DURATIONS = {
    ADMIN_DAYS: 14,
    CUSTOMER_DAYS: 30,
    MS_PER_DAY: 1000 * 60 * 60 * 24,
  } as const;
}
