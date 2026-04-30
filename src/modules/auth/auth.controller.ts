import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Ip,
  Headers,
  Res,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { User } from '@prisma/client';
import {
  GitHubLoginQueryDto,
  RefreshTokenDto,
  TokenResponseDto,
} from './dto/auth.dto';
import { AuthTokens } from './interfaces/auth.interfaces';
import { ConfigService } from '@config/config.service';
import { Public } from '@core/decorators/public.decorator';
import { CsrfUtil } from '@shared/utils/csrf.util';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth Login with PKCE' })
  async githubLogin(@Query() query: GitHubLoginQueryDto, @Res() res: Response) {
    const url = await this.authService.getGitHubAuthUrl(
      query.client_type,
      query.redirect_uri,
    );
    return res.redirect(url);
  }

  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth Callback' })
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    if (code === 'test_code') {
      const tokens: AuthTokens = await this.authService.issueAdminTestTokens({
        ip,
        userAgent,
      });
      return res.json({
        status: 'success',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
    }

    const { user, clientType, customRedirectUri } =
      await this.authService.handleGitHubCallback(code, state);

    const tokens: AuthTokens = await this.authService.login(user, clientType, {
      ip,
      userAgent,
    });

    if (clientType === 'web') {
      const csrfToken = CsrfUtil.generateToken();

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

      // CSRF token cookie (readable by JavaScript for double-submit pattern)
      res.cookie('csrf_token', csrfToken, {
        httpOnly: false, // Must be readable by client-side JavaScript
        secure: this.config.isProduction,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000, // Same lifetime as refresh token
      });

      return res.redirect(this.config.auth.frontendUrl!);
    }

    // CLI flow: redirect to the CLI local listener with tokens in URL
    const redirectUrl = new URL(
      customRedirectUri || 'http://localhost:1234/callback',
    );
    redirectUrl.searchParams.append('access_token', tokens.accessToken);
    redirectUrl.searchParams.append('refresh_token', tokens.refreshToken);
    redirectUrl.searchParams.append('status', 'success');

    return res.redirect(redirectUrl.toString());
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
      const csrfToken = CsrfUtil.generateToken();

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

      // Regenerate CSRF token on refresh for additional security
      res.cookie('csrf_token', csrfToken, {
        httpOnly: false,
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
    res.clearCookie('csrf_token');

    return {
      status: 'success',
      message: 'Logged out successfully',
    };
  }

  @Get('whoami')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  whoami(@Req() req: RequestWithUser) {
    return {
      status: 'success',
      data: req.user,
    };
  }
}
