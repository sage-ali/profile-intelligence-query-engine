import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import type {
  ThrottlerModuleOptions,
  ThrottlerRequest,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '@infrastructure/redis/redis.constants';
import { uuidv7 } from 'uuidv7';

/**
 * Production-Grade Sliding Window Throttler Guard.
 * Uses Redis Sorted Sets (ZSET) to implement a true sliding window algorithm.
 */
@Injectable()
export class RedisThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super(options, storage, reflector);
  }

  /**
   * Overrides handleRequest to implement Sliding Window logic via Redis ZSET.
   */
  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler } = requestProps;
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    // Account for global prefix /api
    const isAuthRoute =
      request.url.startsWith('/api/auth') || request.url.startsWith('/auth');

    // Selective Enforcement: Only apply 'auth' limit to auth routes, and 'api' to others.
    if (throttler.name === 'auth' && !isAuthRoute) return true;
    if (throttler.name === 'api' && isAuthRoute) return true;

    const tracker = await this.getTracker(request);
    const key = `throttler:${tracker}:${throttler.name}`;
    const now = Date.now();
    const windowStart = now - ttl;

    // Sliding Window Algorithm using Redis Sorted Set:
    const multi = this.redis.multi();
    const memberId = `${now}:${uuidv7()}`;

    multi.zadd(key, now, memberId);
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zcard(key);
    multi.expire(key, Math.ceil(ttl / 1000) + 1);

    const results = await multi.exec();

    if (!results || results.length < 3) {
      throw new HttpException(
        'Rate limit check failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // result[2] contains the ZCARD count. ioredis exec returns [Error | null, result][]
    const countResult = results[2];
    const count = typeof countResult[1] === 'number' ? countResult[1] : 0;

    if (count > limit) {
      const response = http.getResponse<Response>();
      response.header('X-RateLimit-Limit', limit.toString());
      response.header('X-RateLimit-Remaining', '0');
      response.header('X-RateLimit-Reset', Math.ceil(ttl / 1000).toString());

      await this.throwThrottlingException();
    }

    return true;
  }

  /**
   * Identify requester (user_id for auth, IP for anonymous).
   * Since this is a global guard running BEFORE JwtAuthGuard, we manually decode the token.
   */
  protected getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;

    // 1. Check Authorization Header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = this.decodeToken(token);
      if (decoded?.sub) return Promise.resolve(`user:${decoded.sub}`);
    }

    // 2. Check Cookie (for web flow)
    const tokenCookie = (
      request.cookies as Record<string, string | undefined> | undefined
    )?.['access_token'];
    if (tokenCookie) {
      const decoded = this.decodeToken(tokenCookie);
      if (decoded?.sub) return Promise.resolve(`user:${decoded.sub}`);
    }

    return Promise.resolve(`ip:${request.ip || 'unknown'}`);
  }

  /**
   * Manually decode JWT payload without verification (faster, suitable for rate limiting tracker).
   */
  private decodeToken(token: string): { sub?: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Payload = parts[1];
      const payload = Buffer.from(base64Payload, 'base64').toString();
      if (!payload) return null;
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      return {
        sub: typeof parsed.sub === 'string' ? parsed.sub : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Custom error response matching project mandate.
   */
  protected throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        status: 'error',
        message: 'Rate limit exceeded',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
