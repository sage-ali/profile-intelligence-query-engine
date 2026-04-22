import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for enriching a profile.
 */
export class EnrichProfileDto {
  /**
   * The first name to enrich.
   * Must contain only letters, hyphens, and apostrophes.
   */
  @ApiProperty({
    description: 'The first name to enrich',
    example: 'peter',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[\p{L}'-]+$/u, {
    message: 'name must contain only letters, hyphens and apostrophes',
  })
  name!: string;
}
