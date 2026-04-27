import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { uuidv7 } from 'uuidv7';

/**
 * Filter for catching and handling HTTP exceptions across the application.
 * Normalizes error responses and logs errors using Pino.
 * Acts as a fallback logger for requests blocked by Guards.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  /**
   * Catches an exception and sends a formatted JSON response.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let serviceName: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, unknown>;
        const msg = resObj.message;
        if (Array.isArray(msg)) {
          message = String(msg[0]);
        } else if (typeof msg === 'string') {
          message = msg;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      const err = exception as Error & {
        status?: number;
        serviceName?: string;
      };
      if (typeof err.status === 'number') {
        status = err.status;
      }
      serviceName = err.serviceName;
    }

    // Log the error in the same format as the LoggingInterceptor
    // Truncate exception for 4xx errors to reduce noise, keep full stack for 5xx
    const exceptionData =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? exception instanceof Error
          ? exception.stack
          : String(exception)
        : undefined;

    this.logger.error({
      request_id: request.id || request.headers['x-correlation-id'] || uuidv7(),
      method: request.method,
      path: request.url.split('?')[0],
      status_code: status,
      userId: request.user?.id || 'anonymous',
      context: 'HTTP_ERROR',
      message: message,
      exception: exceptionData,
      serviceName,
    });

    response.status(status).json({
      status: 'error',
      message,
    });
  }
}
