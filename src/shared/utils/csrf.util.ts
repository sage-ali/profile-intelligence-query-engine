import * as crypto from 'crypto';

/**
 * CSRF Token Utility
 * Provides cryptographically secure token generation for CSRF protection.
 */
export class CsrfUtil {
  /**
   * Generates a cryptographically secure random CSRF token
   * @returns A 64-character hexadecimal token
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Creates an HMAC hash of a token for verification
   * @param token - The token to hash
   * @param secret - The secret key for HMAC
   * @returns The HMAC hash as a hexadecimal string
   */
  static createTokenHash(token: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }
}
