import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'] as const;
const SORT_FIELDS = [
  'created_at',
  'age',
  'gender_probability',
  'country_probability',
  'name',
] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

const toLowerTrimmed = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value.toLowerCase().trim() : undefined;
};

export class GetProfilesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by gender',
    example: 'male',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) => toLowerTrimmed(value))
  gender?: string;

  @ApiPropertyOptional({
    description: 'Filter by country ID',
    example: 'NG',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) => toLowerTrimmed(value))
  country_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by age group',
    example: 'adult',
    enum: AGE_GROUPS,
  })
  @IsOptional()
  @IsIn(AGE_GROUPS)
  @Transform(({ value }: TransformFnParams) => toLowerTrimmed(value))
  age_group?: string;

  @ApiPropertyOptional({
    description: 'Minimum age',
    example: 18,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_age?: number;

  @ApiPropertyOptional({
    description: 'Maximum age',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_age?: number;

  @ApiPropertyOptional({
    description: 'Minimum gender probability',
    example: 0.7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  min_gender_probability?: number;

  @ApiPropertyOptional({
    description: 'Minimum country probability',
    example: 0.6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  min_country_probability?: number;

  @ApiPropertyOptional({
    description: 'Page number for paginated response. Starts from 1',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: SORT_FIELDS,
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sort_by: (typeof SORT_FIELDS)[number] = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SORT_ORDERS,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  order: (typeof SORT_ORDERS)[number] = 'desc';
}
