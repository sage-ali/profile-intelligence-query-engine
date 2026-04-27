import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  BadRequestException,
  UnprocessableEntityException,
  ValidationError,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { ApiVersionGuard } from '@core/guards/api-version.guard';
import { Request } from 'express';

dotenv.config();

/**
 * Bootstraps the NestJS application.
 *
 * Configures global middleware, validation pipes, filters, Swagger documentation,
 * and starts the server on the specified port.
 *
 * @returns {Promise<void>} A promise that resolves when the application has started.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.use(cookieParser());

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Check if the right version accessed
  app.useGlobalGuards(new ApiVersionGuard());

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        // Check if any error is a type validation error (422) vs empty/missing (400)
        const hasTypeError = errors.some((error) => {
          if (!error.constraints) return false;
          const constraintKeys = Object.keys(error.constraints);
          // Type-related constraints get 422
          return constraintKeys.some((key) =>
            [
              'isInt',
              'isNumber',
              'isString',
              'isIn',
              'min',
              'max',
              'isBoolean',
              'isArray',
              'isDate',
            ].includes(key),
          );
        });

        if (hasTypeError) {
          return new UnprocessableEntityException({
            status: 'error',
            message: 'Invalid query parameters',
          });
        }

        return new BadRequestException({
          status: 'error',
          message: 'Invalid query parameters',
        });
      },
    }),
  );

  // Set global prefix for all routes
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health'],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Intelligence Profiles API')
    .setDescription(
      'A NestJS-based REST API that creates an intelligent profile based on searched name.',
    )
    .setVersion('1.0')
    .addTag('classification')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const swaggerUiOptions = {
    swaggerOptions: {
      requestInterceptor: (req: Request) => {
        req.headers['X-API-Version'] = '1';
        return req;
      },
    },
  };
  SwaggerModule.setup('api-docs', app, document, swaggerUiOptions);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
