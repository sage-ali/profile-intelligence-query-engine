import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TokenResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  access_token!: string;

  @ApiProperty()
  refresh_token!: string;
}

export class ExchangeCodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code_verifier!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refresh_token?: string;
}

export class GitHubLoginQueryDto {
  @ApiProperty({ enum: ['web', 'cli'], required: false })
  @IsOptional()
  @IsEnum(['web', 'cli'])
  client_type: 'web' | 'cli' = 'web';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  redirect_uri?: string;
}
