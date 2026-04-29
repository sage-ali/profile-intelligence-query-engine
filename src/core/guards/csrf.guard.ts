import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * CSRF Guard for protecting state-changing operations from Cross-Site Request Forgery attacks.
 * Implements the double-submit cookie pattern for web clients using cookie-based authentication.
 *
 * Security Model:
 * 1. Only applies to state-changing HTTP methods (POST, PUT, DELETE, PATCH)
 * 2. Only enforces for cookie-authenticated requests (not Bearer token requests)
 * 3. Validates that X-CSRF-Token header matches csrf_token cookie
 * 4. Skips validation for public routes and safe methods (GET, HEAD, OPTIONS)
 *
 * This guard must be registered AFTER JwtAuthGuard to ensure authentication context is available.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip CSRF validation for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Only apply CSRF protection to state-changing methods
    const isStateMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
      request.method,
    );

    if (!isStateMutating) {
      return true;
    }

    // Check if request is using cookie authentication (not Bearer token)
    const hasBearerToken = request.headers.authorization?.startsWith('Bearer ');
    const cookies = request.cookies as Record<string, string | undefined>;
    const hasCookie = cookies?.['access_token'];

    // Only enforce CSRF for cookie-based authentication
    // Bearer token requests (CLI/API clients) are exempt
    if (!hasCookie || hasBearerToken) {
      return true;
    }

    // Validate CSRF token using double-submit cookie pattern
    const csrfToken = request.headers['x-csrf-token'] as string | undefined;
    const csrfCookie = cookies['csrf_token'];

    if (!csrfToken || !csrfCookie) {
      throw new ForbiddenException({
        status: 'error',
        message: 'CSRF token missing',
      });
    }

    // Perform constant-time comparison to prevent timing attacks
    if (!this.secureCompare(csrfToken, csrfCookie)) {
      throw new ForbiddenException({
        status: 'error',
        message: 'CSRF token mismatch',
      });
    }

    return true;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a - First string
   * @param b - Second string
   * @returns true if strings match, false otherwise
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
