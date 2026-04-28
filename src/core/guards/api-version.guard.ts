import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard that enforces the 'X-API-Version' header on all /api/* routes.
 * Mandated by Stage 3 implementation plan for API modernization.
 */
@Injectable()
export class ApiVersionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Only apply to routes starting with /api
    if (!request.url.startsWith('/api/')) {
      return true;
    }

    const version = request.headers['x-api-version'];

    if (!version) {
      throw new BadRequestException({
        status: 'error',
        message: 'API version header required',
      });
    }

    if (version !== '1') {
      throw new BadRequestException({
        status: 'error',
        message: 'Unsupported API version',
      });
    }

    return true;
  }
}
