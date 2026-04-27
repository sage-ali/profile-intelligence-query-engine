import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'The unique GitHub ID of the user',
    example: '12345678',
  })
  @IsString()
  @IsNotEmpty()
  githubId!: string;

  @ApiPropertyOptional({
    description: 'The email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'The full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.ANALYST,
    description: 'The access role of the user',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
