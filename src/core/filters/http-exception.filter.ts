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
      const err = exception as Error & { status?: number };
      if (typeof err.status === 'number') {
        status = err.status;
      }

      if (message === 'Profile not found') {
        status = HttpStatus.NOT_FOUND;
      }
    }

    // Map certain messages to specific status codes as per requirements
    if (message === 'Missing or empty name') {
      status = HttpStatus.BAD_REQUEST;
    } else if (
      message === 'Invalid type' ||
      message === 'name must be a string'
    ) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    } else if (
      message === 'Upstream or server failure' ||
      message.includes('returned an invalid response')
    ) {
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        status = HttpStatus.BAD_GATEWAY;
      }
    }

    // Use Pino logger instead of console.error
    this.logger.error(
      {
        method: request.method,
        url: request.url,
        status,
        message,
        exception:
          exception instanceof Error ? exception.message : String(exception),
      },
      'Unhandled exception occurred',
    );

    response.status(status).json({
      status: 'error',
      message,
    });
  }
}
