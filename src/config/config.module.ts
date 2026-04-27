import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import authConfig from './auth.config';
import databaseConfig from './database.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [authConfig, databaseConfig],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
