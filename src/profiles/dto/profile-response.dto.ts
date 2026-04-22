import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for a profile response.
 */
export class ProfileResponseDto {
  /**
   * Unique identifier of the profile.
   */
  @ApiProperty()
  id!: string;

  /**
   * Name associated with the profile.
   */
  @ApiProperty()
  name!: string;

  /**
   * Predicted gender of the name.
   */
  @ApiProperty()
  gender!: string;

  /**
   * Probability score for the predicted gender.
   */
  @ApiProperty()
  gender_probability!: number;

  /**
   * Number of samples used for prediction.
   */
  @ApiProperty()
  sample_size!: number;

  /**
   * Predicted age associated with the name.
   */
  @ApiProperty()
  age!: number;

  /**
   * Age group category based on the predicted age.
   */
  @ApiProperty()
  age_group!: string;

  /**
   * Predicted country ID (ISO 3166-1 alpha-2) for the name.
   */
  @ApiProperty()
  country_id!: string;

  /**
   * Probability score for the predicted country.
   */
  @ApiProperty()
  country_probability!: number;

  /**
   * Timestamp when the profile was created.
   */
  @ApiProperty()
  created_at!: Date;
}

/**
 * Data transfer object for a successful profile creation or retrieval.
 */
export class ProfileSuccessResponseDto {
  /**
   * Status of the response.
   */
  @ApiProperty({ example: 'success' })
  status!: string;

  /**
   * Profile data.
   */
  @ApiProperty({ type: ProfileResponseDto })
  data!: ProfileResponseDto;
}

/**
 * Data transfer object for a successful profile response with an additional message.
 */
export class ProfileSuccessWithMessageResponseDto {
  /**
   * Status of the response.
   */
  @ApiProperty({ example: 'success' })
  status!: string;

  /**
   * Informational message about the response.
   */
  @ApiProperty({ example: 'Profile already exists' })
  message!: string;

  /**
   * Profile data.
   */
  @ApiProperty({ type: ProfileResponseDto })
  data!: ProfileResponseDto;
}

/**
 * Data transfer object for a list of profiles.
 */
export class ProfileListResponseDto {
  /**
   * Status of the response.
   */
  @ApiProperty({ example: 'success' })
  status!: string;

  /**
   * Total number of profiles returned.
   */
  @ApiProperty({ example: 2 })
  count!: number;

  /**
   * Array of profile data.
   */
  @ApiProperty({ type: [ProfileResponseDto] })
  data!: ProfileResponseDto[];
}
