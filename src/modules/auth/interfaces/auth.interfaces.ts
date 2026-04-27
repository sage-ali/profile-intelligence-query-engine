export interface GithubProfile {
  githubId: string;
  email?: string;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  role: string;
  username: string;
  session_id: string;
  familyId?: string;
}

export interface SessionDetails {
  ip?: string;
  userAgent?: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface GitHubUserResponse {
  id: number;
  email: string | null;
  name: string | null;
  login: string;
}

export interface RefreshTokenPayload {
  sub: string;
  session_id: string;
  familyId: string;
}

export interface GitHubPassportProfile {
  id: string;
  displayName: string;
  username: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  _json: {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
  };
}
