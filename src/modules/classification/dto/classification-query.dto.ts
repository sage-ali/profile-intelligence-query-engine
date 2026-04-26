import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for a name classification query.
 */
export class ClassificationQueryDto {
  /**
   * The name to classify.
   * Must contain only letters, spaces, and hyphens.
   */
  @ApiProperty({
    description: 'The name to classify',
    required: true,
    example: 'john',
  })
  @IsString({ message: 'Invalid type' })
  @IsNotEmpty({
    message: 'Missing or empty name',
  })
  @Matches(/^[a-zA-Z\s-]+$/, {
    message: 'Name must contain only letters, spaces, and hyphens',
  })
  name!: string;
}
