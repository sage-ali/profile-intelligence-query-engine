import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@config/config.service';

/**
 * Service responsible for managing the Prisma Client connection to the database.
 *
 * @remarks
 * This service extends the {@link PrismaClient} and implements NestJS lifecycle hooks
 * to ensure the database connection is properly managed during application startup and shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Initializes the PrismaService and configures the database adapter.
   *
   * @throws {Error} If the `DATABASE_URL` environment variable is missing or empty.
   */
  constructor(configService: ConfigService) {
    const { url: dbUrl } = configService.database;

    if (typeof dbUrl !== 'string' || dbUrl.trim() === '') {
      throw new Error(
        'CRITICAL BOOT FAILURE: DATABASE_URL environment variable is missing or not a string.',
      );
    }

    // 1. Wrap the database connection string in the Prisma 7 adapter
    const isProduction = process.env.NODE_ENV === 'production';
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });
    const adapter = new PrismaPg(pool);

    // 2. Pass the adapter to the PrismaClient constructor
    super({ adapter });
  }

  /**
   * Connects to the database when the module is initialized.
   *
   * @returns A promise that resolves when the connection is established.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnects from the database when the module is destroyed.
   *
   * @returns A promise that resolves when the connection is closed.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
