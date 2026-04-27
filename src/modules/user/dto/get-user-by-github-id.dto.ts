import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserByGithubIdDto {
  @ApiProperty({
    description: 'The unique GitHub ID of the user',
    example: '12345678',
  })
  @IsString()
  @IsNotEmpty()
  githubId!: string;
}
