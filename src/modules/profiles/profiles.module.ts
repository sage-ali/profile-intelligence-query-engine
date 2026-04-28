import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { NlqService } from './utils/nlq-service';
import { ProfilesRepository } from './repositories/profiles.repository';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [ProfilesService, NlqService, ProfilesRepository],
  controllers: [ProfilesController],
})
/**
 * Module responsible for handling user profiles and enrichment.
 */
export class ProfilesModule {}
