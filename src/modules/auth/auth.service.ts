import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../../config/config.service';
import { UserRepository } from '../user/repositories/user.repository';
import { AuthRepository } from './repositories/auth.repository';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import axios from 'axios';
import {
  GithubProfile,
  AuthTokens,
  SessionDetails,
  GitHubTokenResponse,
  GitHubUserResponse,
  JwtPayload,
  RefreshTokenPayload,
} from './interfaces/auth.interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async validateGithubUser(profile: GithubProfile): Promise<User> {
    return this.userRepository.findOrCreateByGithub(profile);
  }

  async verifyGithubCode(code: string, codeVerifier: string): Promise<User> {
    try {
      const { githubClientId, githubClientSecret } = this.configService.auth;

      const tokenResponse = await axios.post<GitHubTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code,
          code_verifier: codeVerifier,
        },
        {
          headers: { Accept: 'application/json' },
        },
      );

      const { access_token, error, error_description } = tokenResponse.data;

      if (error) {
        throw new BadRequestException(error_description || error);
      }

      const userResponse = await axios.get<GitHubUserResponse>(
        'https://api.github.com/user',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );

      const { id, email, name, login, avatar_url } = userResponse.data;

      return this.validateGithubUser({
        githubId: id.toString(),
        email: email || undefined,
        name: name || login,
        username: login,
        avatarUrl: avatar_url,
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new UnauthorizedException('Failed to verify GitHub code');
    }
  }

  async login(
    user: User,
    clientType: 'web' | 'cli',
    details?: SessionDetails,
  ): Promise<AuthTokens> {
    const refreshTokenFamilyId = crypto.randomUUID();

    await this.userRepository.updateLastLogin(user.id);

    const session = await this.authRepository.createSession({
      userId: user.id,
      clientType,
      refreshTokenHash: 'PENDING',
      refreshTokenFamilyId,
      expiresAt: this.getRefreshTokenExpiresAt(),
      ipAddress: details?.ip,
      userAgent: details?.userAgent,
    });

    const tokens = await this.generateTokens(
      user,
      session.id,
      refreshTokenFamilyId,
    );

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.hashToken(tokens.refreshToken) },
    });

    return tokens;
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const { jwtSecret } = this.configService.auth;

      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: jwtSecret },
      );

      const tokenHash = this.hashToken(refreshToken);
      const session =
        await this.authRepository.findSessionByTokenHash(tokenHash);

      if (!session) {
        await this.authRepository.revokeFamily(payload.familyId);
        throw new UnauthorizedException('Invalid or reused refresh token');
      }

      if (session.revokedAt || new Date() > session.expiresAt) {
        await this.authRepository.revokeFamily(session.refreshTokenFamilyId);
        throw new UnauthorizedException('Invalid or reused refresh token');
      }

      await this.authRepository.touchSession(session.id);

      const newSession = await this.authRepository.createSession({
        userId: session.userId,
        clientType: session.clientType,
        refreshTokenHash: 'PENDING',
        refreshTokenFamilyId: session.refreshTokenFamilyId,
        expiresAt: this.getRefreshTokenExpiresAt(),
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
      });

      const tokens = await this.generateTokens(
        session.user,
        newSession.id,
        session.refreshTokenFamilyId,
      );

      const newRefreshTokenHash = this.hashToken(tokens.refreshToken);

      await this.prisma.authSession.update({
        where: { id: newSession.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      await this.authRepository.setReplacementTokenHash(
        session.id,
        newRefreshTokenHash,
      );

      await this.authRepository.revokeSession(session.id);

      return tokens;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.authRepository.findSessionByTokenHash(tokenHash);
    if (session) {
      await this.authRepository.revokeSession(session.id);
    }
  }

  private async generateTokens(
    user: User,
    sessionId: string,
    familyId: string,
  ): Promise<AuthTokens> {
    const { jwtSecret, jwtAccessExpiration, jwtRefreshExpiration } =
      this.configService.auth;
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      username: user.name || user.githubId,
      session_id: sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: jwtAccessExpiration,
      }),
      this.jwtService.signAsync(
        { ...payload, familyId },
        {
          secret: jwtSecret,
          expiresIn: jwtRefreshExpiration,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenExpiresAt(): Date {
    const { jwtRefreshExpiration } = this.configService.auth;
    const date = new Date();
    date.setSeconds(date.getSeconds() + Number(jwtRefreshExpiration));
    return date;
  }
}
