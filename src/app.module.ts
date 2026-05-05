import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClassificationModule } from '@modules/classification/classification.module';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { ProfilesModule } from '@modules/profiles/profiles.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '@infrastructure/redis/redis.constants';
import { LoggingInterceptor } from '@core/interceptors/logging.interceptor';
import { HttpExceptionFilter } from '@core/filters/http-exception.filter';
import { ApiVersionGuard } from '@core/guards/api-version.guard';
import { RedisThrottlerGuard } from '@core/guards/redis-throttler-guard.guard';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { ActiveUserGuard } from '@core/guards/active-user.guard';
import { RolesGuard } from '@core/guards/roles.guard';
import { CsrfGuard } from '@core/guards/csrf.guard';

@Module({
  imports: [
    ConfigModule,
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
        serializers: {
          req: () => undefined,
          res: () => undefined,
        },
      },
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [
          {
            name: 'auth',
            ttl: 60000, // 1 minute
            limit: 11,
          },
          {
            name: 'api',
            ttl: 60000, // 1 minute
            limit: 60,
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    PrismaModule,
    ClassificationModule,
    ProfilesModule,
    UserModule,
    AuthModule,
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
    {
      provide: APP_GUARD,
      useClass: ApiVersionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RedisThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ActiveUserGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
