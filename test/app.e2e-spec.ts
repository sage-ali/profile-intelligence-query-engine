import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { GithubStrategy } from '../src/modules/auth/strategies/github.strategy';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const mockPrismaService = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    onModuleInit: vi.fn().mockResolvedValue(undefined),
    onModuleDestroy: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(GithubStrategy)
      .useValue({
        // Minimal mock to satisfy the injector
        validate: vi.fn(),
      })
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
