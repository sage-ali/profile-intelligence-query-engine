import { ApiProperty } from '@nestjs/swagger';

export type ImportSkipReasons = Record<string, number>;

export class ImportResultDto {
  @ApiProperty({ example: 'success' })
  status: string = 'success';

  @ApiProperty({ example: 50000 })
  total_rows!: number;

  @ApiProperty({ example: 48231 })
  inserted!: number;

  @ApiProperty({ example: 1769 })
  skipped!: number;

  @ApiProperty({
    example: { duplicate_name: 1203, invalid_age: 312, missing_fields: 254 },
  })
  reasons!: ImportSkipReasons;
}
