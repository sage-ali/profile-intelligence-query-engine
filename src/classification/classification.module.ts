import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClassificationService } from './classification.service';
import { ClassificationController } from './classification.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [ClassificationController],
  providers: [ClassificationService],
})
/**
 * Module responsible for name gender classification logic.
 */
export class ClassificationModule {}
