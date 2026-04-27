import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClassificationModule } from '@modules/classification/classification.module';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { ProfilesModule } from '@modules/profiles/profiles.module';
import { LoggingInterceptor } from '@core/interceptors/logging.interceptor';
import { HttpExceptionFilter } from '@core/filters/http-exception.filter';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        autoLogging: false,
        // Disable default serializers to remove redundant 'req' and 'res' blocks
        serializers: {
          req: () => undefined,
          res: () => undefined,
        },
      },
    }),
    PrismaModule,
    ClassificationModule,
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
