import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = User>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Please authenticate to access this resource')
      );
    }
    return user;
  }
}
