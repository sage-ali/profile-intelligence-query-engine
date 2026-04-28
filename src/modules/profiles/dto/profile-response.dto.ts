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
   * Full country name.
   */
  @ApiProperty({ example: 'United States' })
  country_name!: string;

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

export class ProfileLinksDto {
  @ApiProperty({ example: '/api/profiles?page=1&limit=10' })
  self!: string;

  @ApiProperty({ example: '/api/profiles?page=2&limit=10', nullable: true })
  next!: string | null;

  @ApiProperty({ example: null, nullable: true })
  prev!: string | null;
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
   * Current page number
   */
  @ApiProperty({ example: 1 })
  page!: number;

  /**
   * maximum number of items requested/returned per page.
   */
  @ApiProperty({ example: 10 })
  limit!: number;

  /**
   * Total number of items across all pages.
   */
  @ApiProperty({ example: 2026 })
  total!: number;

  /**
   * Total number of pages.
   */
  @ApiProperty({ example: 203 })
  total_pages!: number;

  /**
   * Pagination links.
   */
  @ApiProperty({ type: ProfileLinksDto })
  links!: ProfileLinksDto;

  /**
   * Array of profile data.
   */
  @ApiProperty({ type: [ProfileResponseDto] })
  data!: ProfileResponseDto[];
}
