import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';
import { uuidv7 } from 'uuidv7';

/**
 * Global interceptor for logging every request and response.
 * Enforces the "No Regression" logging policy for production-grade observability.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const headerId = request.headers['x-correlation-id'];
    const requestId = typeof headerId === 'string' ? headerId : uuidv7();
    const method = request.method;
    const url = request.url;
    const startTime = Date.now();

    // Attach request ID to request for downstream use if needed
    request.id = requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.info({
            request_id: requestId,
            method,
            path: url.split('?')[0],
            status_code: statusCode,
            duration_ms: duration,
            userId: request.user?.id || 'anonymous',
            context: 'HTTP',
          });
        },
        error: (err: { status?: number; message: string }) => {
          const duration = Date.now() - startTime;
          const statusCode = err.status || 500;

          this.logger.error({
            request_id: requestId,
            method,
            path: url.split('?')[0],
            status_code: statusCode,
            duration_ms: duration,
            userId: request.user?.id || 'anonymous',
            context: 'HTTP',
            error: err.message,
          });
        },
      }),
    );
  }
}
