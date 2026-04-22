import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

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

  // Enable CORS
  app.enableCors({
    origin: '*',
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable global exception filter
  const logger = app.get(Logger);
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Set global prefix for all routes
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health'], // Exclude health routes from the prefix
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Name Gender Classification API')
    .setDescription(
      'A NestJS-based REST API that predicts the gender of a given name using the Genderize.io service.',
    )
    .setVersion('1.0')
    .addTag('classification')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
