import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { GetProfilesQueryDto } from './dto/get-profiles-query.dto';
import {
  ProfileSuccessResponseDto,
  ProfileSuccessWithMessageResponseDto,
  ProfileListResponseDto,
} from './dto/profile-response.dto';
import { SearchProfilesQueryDto } from './dto/search-query.dto';
import { NlqService } from './utils/nlq-service';
import { BadRequestException } from '@nestjs/common';

/**
 * Controller for managing user profiles.
 * Provides endpoints for creating, retrieving, and deleting profiles.
 */
@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly nlqService: NlqService,
  ) {}

  /**
   * Creates a new profile or retrieves an existing one.
   *
   * @param createProfileDto - The data required to create a profile.
   * @returns A promise that resolves to the created or existing profile.
   * @throws {BadGatewayException} If profile enrichment fails.
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new profile with idempotency',
    description:
      'Creates a new profile by enriching the name with gender, age, and nationality data. If the profile already exists, returns the existing one.',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile created successfully',
    type: ProfileSuccessResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile already exists',
    type: ProfileSuccessWithMessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid name parameter' })
  @ApiResponse({
    status: 502,
    description: 'Upstream API error or invalid data',
  })
  async create(
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<ProfileSuccessResponseDto | ProfileSuccessWithMessageResponseDto> {
    try {
      const result = await this.profilesService.createProfile(
        createProfileDto.name,
      );

      if (result.existing) {
        return {
          status: 'success',
          message: 'Profile already exists',
          data: {
            id: result.profile.id,
            name: result.profile.name,
            gender: result.profile.gender,
            gender_probability: result.profile.gender_probability,
            age: result.profile.age,
            age_group: result.profile.age_group,
            country_id: result.profile.country_id,
            country_name: result.profile.country_name,
            country_probability: result.profile.country_probability,
            created_at: result.profile.created_at,
          },
        };
      }

      return {
        status: 'success',
        data: {
          id: result.profile.id,
          name: result.profile.name,
          gender: result.profile.gender,
          gender_probability: result.profile.gender_probability,
          age: result.profile.age,
          age_group: result.profile.age_group,
          country_id: result.profile.country_id,
          country_name: result.profile.country_name,
          country_probability: result.profile.country_probability,
          created_at: result.profile.created_at,
        },
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      if (
        error instanceof Error &&
        error.message === 'Profile enrichment failed'
      ) {
        throw new BadGatewayException('Profile enrichment failed');
      }
      throw error;
    }
  }

  @Get('search')
  @ApiOperation({
    summary: 'Get all profiles with natural language filtering',
    description:
      'Retrieves all profiles with matching the natural language query.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profiles retrieved successfully',
    type: ProfileListResponseDto,
  })
  async search(
    @Query() query: SearchProfilesQueryDto,
  ): Promise<ProfileListResponseDto> {
    if (!query.q) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid query parameters',
      });
    }

    const parsed = this.nlqService.parse(query.q);

    if (Object.keys(parsed).length === 0) {
      throw new BadRequestException({
        status: 'error',
        message: 'Unable to interpret query',
      });
    }
    const { page, limit, total, data } =
      await this.profilesService.findAllProfiles(parsed);

    return {
      status: 'success',
      page,
      limit,
      total,
      data: data.map((profile) => ({
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_name: profile.country_name,
        country_probability: profile.country_probability,
        created_at: profile.created_at,
      })),
    };
  }

  /**
   * Retrieves a profile by its ID.
   *
   * @param id - The unique identifier of the profile.
   * @returns A promise that resolves to the found profile.
   * @throws {NotFoundException} If the profile is not found.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get profile by ID',
    description: 'Retrieves a profile by its unique identifier.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile found',
    type: ProfileSuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async findById(@Param('id') id: string): Promise<ProfileSuccessResponseDto> {
    const profile = await this.profilesService.findProfileById(id);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      status: 'success',
      data: {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_name: profile.country_name,
        country_probability: profile.country_probability,
        created_at: profile.created_at,
      },
    };
  }

  /**
   * Retrieves all profiles, optionally filtered by gender, country, or age group.
   *
   * @param query - The filtering criteria.
   * @returns A promise that resolves to a list of profiles and the total count.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all profiles with optional filtering',
    description:
      'Retrieves all profiles with optional case-insensitive filtering by gender, country_id, and age_group.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profiles retrieved successfully',
    type: ProfileListResponseDto,
  })
  async findAll(
    @Query() query: GetProfilesQueryDto,
  ): Promise<ProfileListResponseDto> {
    const { page, limit, total, data } =
      await this.profilesService.findAllProfiles(query);

    return {
      status: 'success',
      page,
      limit,
      total,
      data: data.map((profile) => ({
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_name: profile.country_name,
        country_probability: profile.country_probability,
        created_at: profile.created_at,
      })),
    };
  }

  /**
   * Deletes a profile by its ID.
   *
   * @param id - The unique identifier of the profile to delete.
   * @returns A promise that resolves when the profile is deleted.
   * @throws {NotFoundException} If the profile is not found.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete profile by ID',
    description: 'Deletes a profile by its unique identifier.',
  })
  @ApiResponse({
    status: 204,
    description: 'Profile deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async delete(@Param('id') id: string): Promise<void> {
    try {
      await this.profilesService.deleteProfile(id);
    } catch {
      throw new NotFoundException('Profile not found');
    }
  }
}
