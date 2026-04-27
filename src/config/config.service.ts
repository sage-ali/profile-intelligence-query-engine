import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  get auth() {
    return {
      githubClientId: this.nestConfigService.get<string>('auth.githubClientId'),
      githubClientSecret: this.nestConfigService.get<string>(
        'auth.githubClientSecret',
      ),
      githubCallbackUrl: this.nestConfigService.get<string>(
        'auth.githubCallbackUrl',
      ),
      jwtSecret: this.nestConfigService.get<string>('auth.jwtSecret'),
      jwtAccessExpiration: this.nestConfigService.get<number>(
        'auth.jwtAccessExpiration',
      ),
      jwtRefreshExpiration: this.nestConfigService.get<number>(
        'auth.jwtRefreshExpiration',
      ),
    };
  }

  get database() {
    return {
      url: this.nestConfigService.get<string>('database.url'),
    };
  }

  get isProduction(): boolean {
    return this.nestConfigService.get<string>('NODE_ENV') === 'production';
  }
}
