import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Ip,
  Headers,
  UseGuards,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { type Request, type Response } from 'express';
import { User } from '@prisma/client';
import {
  ExchangeCodeDto,
  RefreshTokenDto,
  TokenResponseDto,
} from './dto/auth.dto';
import { AuthTokens } from './interfaces/auth.interfaces';
import { ConfigService } from '@config/config.service';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub Web Login (Redirect)' })
  async githubLogin() {
    // Standard Passport-GitHub flow starts here
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth Callback' })
  @ApiResponse({ type: TokenResponseDto })
  async githubCallback(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ status: string; message: string }> {
    if (!req.user) {
      throw new UnauthorizedException('GitHub authentication failed');
    }

    const user = req.user;
    const tokens: AuthTokens = await this.authService.login(user, 'web', {
      ip,
      userAgent,
    });

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      maxAge: 3 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    return {
      status: 'success',
      message: 'Logged in successfully via Web',
    };
  }

  @Post('github/exchange')
  @ApiOperation({ summary: 'Exchange GitHub Code for Tokens (CLI PKCE)' })
  @ApiResponse({ type: TokenResponseDto })
  async exchangeCode(
    @Body() exchangeCodeDto: ExchangeCodeDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<TokenResponseDto> {
    const { code, code_verifier } = exchangeCodeDto;
    const user = await this.authService.verifyGithubCode(code, code_verifier);
    const tokens: AuthTokens = await this.authService.login(user, 'cli', {
      ip,
      userAgent,
    });

    return {
      status: 'success',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiResponse({ type: TokenResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto?: RefreshTokenDto,
  ): Promise<TokenResponseDto> {
    const cookies = req.cookies as Record<string, string | undefined>;
    const refreshToken =
      refreshTokenDto?.refresh_token ?? cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokens: AuthTokens =
      await this.authService.refreshTokens(refreshToken);

    if (cookies['refresh_token']) {
      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        secure: this.config.isProduction,
        sameSite: 'lax',
        maxAge: 3 * 60 * 1000,
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: this.config.isProduction,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
      });
    }

    return {
      status: 'success',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto?: RefreshTokenDto,
  ): Promise<{ status: string; message: string }> {
    const cookies = req.cookies as Record<string, string | undefined>;
    const refreshToken =
      refreshTokenDto?.refresh_token ?? cookies['refresh_token'];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      status: 'success',
      message: 'Logged out successfully',
    };
  }
}
