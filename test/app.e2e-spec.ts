import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { describe, it, beforeEach, afterEach, vi } from 'vitest';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const mockPrismaService = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    onModuleInit: vi.fn().mockResolvedValue(undefined),
    onModuleDestroy: vi.fn().mockResolvedValue(undefined),
  };

  const mockRedisClient = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
    multi: vi.fn().mockReturnValue({
      zadd: vi.fn().mockReturnThis(),
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 'OK'],
        [null, 0],
        [null, 1],
      ]),
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockRedisClient)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
        status: 'success',
        data: { message: 'Hello World!' },
      });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
