import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

/**
 * Filter for catching and handling HTTP exceptions across the application.
 * Normalizes error responses and logs errors using Pino.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(Logger) private readonly logger: Logger) {}

  /**
   * Catches an exception and sends a formatted JSON response.
   *
   * @param exception - The exception being handled.
   * @param host - The arguments host providing context for the current execution.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';

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
          message = String(msg[0]); // Pick the first validation error message
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
      // Handle custom error classes with status property
      const err = exception as Error & {
        status?: number;
        serviceName?: string;
      };
      if (typeof err.status === 'number') {
        status = err.status;
      }

      // Use the service name for more context if available
      const serviceName = err.serviceName;

      // Use Pino logger instead of console.error
      this.logger.error(
        {
          method: request.method,
          url: request.url,
          status,
          message,
          serviceName,
          exception:
            exception instanceof Error ? exception.message : String(exception),
        },
        'Unhandled exception occurred',
      );
    }

    response.status(status).json({
      status: 'error',
      message,
    });
  }
}
