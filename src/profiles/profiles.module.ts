import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NlqService } from './utils/nlq-service';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [ProfilesService, NlqService],
  controllers: [ProfilesController],
})
/**
 * Module responsible for handling user profiles and enrichment.
 */
export class ProfilesModule {}
