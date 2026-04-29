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
      frontendUrl: this.nestConfigService.get<string>('auth.frontendUrl'),
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

  get externalApis() {
    return {
      genderize:
        this.nestConfigService.get<string>('EXTERNAL_GENDERIZE_URL') ||
        'https://api.genderize.io',
      agify:
        this.nestConfigService.get<string>('EXTERNAL_AGIFY_URL') ||
        'https://api.agify.io',
      nationalize:
        this.nestConfigService.get<string>('EXTERNAL_NATIONALIZE_URL') ||
        'https://api.nationalize.io',
    };
  }

  get isProduction(): boolean {
    return this.nestConfigService.get<string>('NODE_ENV') === 'production';
  }
}
