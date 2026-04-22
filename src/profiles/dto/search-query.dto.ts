import { IsString, IsNotEmpty } from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
}
