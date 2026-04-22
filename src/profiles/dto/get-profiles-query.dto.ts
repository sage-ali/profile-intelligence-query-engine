import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for filtering profiles.
 */
export class GetProfilesQueryDto {
  /**
   * Filter by gender.
   */
  @ApiProperty({
    description: 'Filter by gender',
    example: 'male',
    required: false,
  })
  @IsOptional()
  @IsString()
  gender?: string;

  /**
   * Filter by country ID.
   */
  @ApiProperty({
    description: 'Filter by country ID',
    example: 'NG',
    required: false,
  })
  @IsOptional()
  @IsString()
  country_id?: string;

  /**
   * Filter by age group.
   */
  @ApiProperty({
    description: 'Filter by age group',
    example: 'adult',
    required: false,
    enum: ['child', 'teenager', 'adult', 'senior'],
  })
  @IsOptional()
  @IsString()
  age_group?: string;
}
