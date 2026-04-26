import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const toLowerTrimmed = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value.toLowerCase().trim() : undefined;
};

export class SearchProfilesQueryDto {
  @ApiProperty({
    description: 'Natural Language search query',
    example: 'Young female from Kenya',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => toLowerTrimmed(value))
  q!: string;

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
  @Max(50)
  limit: number = 10;
}
