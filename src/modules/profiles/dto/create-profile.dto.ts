import {
  IsNotEmpty,
  IsString,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Custom validator that checks if a string contains only alphabetic characters,
 * apostrophes, and hyphens. Skips validation for non-string or empty values,
 * delegating those checks to @IsNotEmpty and @IsString.
 */
function IsAlphabeticName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAlphabeticName',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || value.length === 0) return true;
          return /^[\p{L}'-]+$/u.test(value);
        },
      },
    });
  };
}

/**
 * Data transfer object for creating a profile.
 */
export class CreateProfileDto {
  /**
   * The first name to enrich and store.
   * Must contain only alphabetic characters.
   */
  @ApiProperty({
    description: 'The first name to enrich and store',
    example: 'ella',
  })
  @IsNotEmpty({ message: 'Missing or empty name' })
  @IsString({ message: 'Invalid type' })
  @IsAlphabeticName({
    message: 'name must contain only alphabetic characters',
  })
  name!: string;
}
