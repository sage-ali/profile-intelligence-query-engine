import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@config/config.service';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/auth.interfaces';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }
          const cookies = req.cookies as Record<string, string | undefined>;
          return cookies['access_token'] || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.auth.jwtSecret ?? 'fallback-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
