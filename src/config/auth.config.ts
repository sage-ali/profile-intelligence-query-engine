import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtAccessExpiration: 180,
  jwtRefreshExpiration: 300,
}));
