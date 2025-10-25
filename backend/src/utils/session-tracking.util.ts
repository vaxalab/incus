/**
 * Session tracking utility functions for parsing user agent and extracting session metadata
 */

import type { Request } from 'express';
import { SessionUtil } from './session.util';
import type { UserRole } from '../../generated/prisma';

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  device?: string;
  browser?: string;
  expiresAt: Date;
}

export class SessionTrackingUtil {
  /**
   * Extract session metadata from request
   * @param req - Express request object
   * @param userRole - User role for calculating expiration
   * @returns Session metadata object
   */
  static extractSessionMetadata(
    req: Request,
    userRole: UserRole,
  ): SessionMetadata {
    const userAgent = req.get('user-agent');
    const ipAddress = this.getClientIP(req);

    return {
      ipAddress,
      userAgent,
      device: this.parseDevice(userAgent),
      browser: this.parseBrowser(userAgent),
      country: undefined, // Could integrate with IP geolocation service
      expiresAt: new Date(
        Date.now() + SessionUtil.calculateSessionMaxAge(userRole),
      ),
    };
  }

  /**
   * Get client IP address from request
   * @param req - Express request object
   * @returns Client IP address
   */
  private static getClientIP(req: Request): string | undefined {
    // Check for forwarded IP (behind proxy/load balancer)
    const forwarded = req.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    // Check other common headers
    const realIP = req.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    // Fallback to connection remote address
    return req.ip || req.connection.remoteAddress;
  }

  /**
   * Parse device type from user agent
   * @param userAgent - User agent string
   * @returns Device type (mobile, tablet, desktop)
   */
  private static parseDevice(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    const ua = userAgent.toLowerCase();

    // Mobile patterns
    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return 'mobile';
    }

    // Tablet patterns
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    // Default to desktop
    return 'desktop';
  }

  /**
   * Parse browser from user agent
   * @param userAgent - User agent string
   * @returns Browser name
   */
  private static parseBrowser(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    const ua = userAgent.toLowerCase();

    // Browser patterns (order matters - more specific first)
    if (ua.includes('edg/')) return 'edge';
    if (ua.includes('chrome/')) return 'chrome';
    if (ua.includes('firefox/')) return 'firefox';
    if (ua.includes('safari/') && !ua.includes('chrome')) return 'safari';
    if (ua.includes('opera/') || ua.includes('opr/')) return 'opera';

    return 'unknown';
  }

  /**
   * Update session activity timestamp
   * @param sessionId - Session ID to update
   * @param databaseService - Database service instance
   */
  static async updateSessionActivity(
    sessionId: string,
    databaseService: any, // We'll properly type this when we integrate
  ): Promise<void> {
    try {
      await databaseService.session.update({
        where: { sid: sessionId },
        data: {
          lastActivity: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      // Silently fail - session tracking shouldn't break the app
      console.warn('Failed to update session activity:', error);
    }
  }

  /**
   * Mark session as logged out
   * @param sessionId - Session ID to mark as logged out
   * @param databaseService - Database service instance
   */
  static async markSessionLoggedOut(
    sessionId: string,
    databaseService: any,
  ): Promise<void> {
    try {
      await databaseService.session.update({
        where: { sid: sessionId },
        data: {
          isActive: false,
          logoutAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.warn('Failed to mark session as logged out:', error);
    }
  }

  /**
   * Clean up expired sessions from database
   * @param databaseService - Database service instance
   */
  static async cleanupExpiredSessions(databaseService: any): Promise<void> {
    try {
      const result = await databaseService.session.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      console.log(`Marked ${result.count} expired sessions as inactive`);
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }
}
