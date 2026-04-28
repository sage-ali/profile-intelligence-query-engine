import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@config/config.service';
import { AuthService } from '../auth.service';
import { GitHubPassportProfile } from '../interfaces/auth.interfaces';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const { githubClientId, githubClientSecret, githubCallbackUrl } =
      configService.auth;

    if (!githubClientId || !githubClientSecret || !githubCallbackUrl)
      throw new Error('Missing GitHub credentials');
    super({
      clientID: githubClientId,
      clientSecret: githubClientSecret,
      callbackURL: githubCallbackUrl,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GitHubPassportProfile,
  ) {
    const { id, emails, displayName, username, _json } = profile;

    const user = await this.authService.validateGithubUser({
      githubId: id,
      email: emails?.[0]?.value,
      name: displayName || username,
      username: username,
      avatarUrl: _json.avatar_url,
    });

    return user;
  }
}
