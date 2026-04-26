import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
/**
 * Module that provides and exports the Prisma service for database access.
 */
export class PrismaModule {}
