import { ConflictException } from '@nestjs/common';

export interface PasswordRequirements {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  customPattern?: RegExp;
  customPatternMessage?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordValidationUtil {
  private static readonly DEFAULT_REQUIREMENTS: PasswordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  };

  /**
   * Validates password strength and returns detailed validation result
   * @param password - The password to validate
   * @param requirements - Custom requirements (optional)
   * @returns PasswordValidationResult with validation status and errors
   */
  static validatePassword(
    password: string,
    requirements: PasswordRequirements = {},
  ): PasswordValidationResult {
    const config = { ...this.DEFAULT_REQUIREMENTS, ...requirements };
    const errors: string[] = [];

    // Check minimum length
    if (config.minLength && password.length < config.minLength) {
      errors.push(
        `Password must be at least ${config.minLength} characters long`,
      );
    }

    // Check uppercase requirement
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase requirement
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check numbers requirement
    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check special characters requirement
    if (
      config.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    // Check custom pattern if provided
    if (config.customPattern && !config.customPattern.test(password)) {
      errors.push(
        config.customPatternMessage ||
          'Password does not meet custom requirements',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates password strength and throws ConflictException if invalid
   * @param password - The password to validate
   * @param requirements - Custom requirements (optional)
   * @throws ConflictException if password doesn't meet requirements
   */
  static validatePasswordStrength(
    password: string,
    requirements: PasswordRequirements = {},
  ): void {
    const validation = this.validatePassword(password, requirements);

    if (!validation.isValid) {
      throw new ConflictException(
        `Password does not meet requirements: ${validation.errors.join(', ')}`,
      );
    }
  }

  /**
   * Get password strength score (0-100)
   * @param password - The password to score
   * @returns number - Password strength score
   */
  static getPasswordStrength(password: string): number {
    let score = 0;
    const checks = [
      { test: (p: string) => p.length >= 8, points: 25 },
      { test: (p: string) => p.length >= 12, points: 10 },
      { test: (p: string) => /[A-Z]/.test(p), points: 15 },
      { test: (p: string) => /[a-z]/.test(p), points: 15 },
      { test: (p: string) => /\d/.test(p), points: 15 },
      {
        test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(p),
        points: 15,
      },
      {
        test: (p: string) =>
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(p),
        points: 5,
      },
    ];

    checks.forEach((check) => {
      if (check.test(password)) {
        score += check.points;
      }
    });

    return Math.min(100, score);
  }

  /**
   * Get password strength description
   * @param password - The password to evaluate
   * @returns string - Strength description
   */
  static getPasswordStrengthDescription(password: string): string {
    const score = this.getPasswordStrength(password);

    if (score < 30) return 'Very Weak';
    if (score < 50) return 'Weak';
    if (score < 70) return 'Fair';
    if (score < 90) return 'Good';
    return 'Excellent';
  }
}
