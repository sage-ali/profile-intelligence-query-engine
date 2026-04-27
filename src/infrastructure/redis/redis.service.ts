import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  /**
   * Returns the shared Redis client instance.
   */
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Ensures the Redis connection is closed when the application is destroyed.
   */
  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
