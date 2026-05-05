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
  BadRequestException,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { GetProfilesQueryDto } from './dto/get-profiles-query.dto';
import {
  ProfileSuccessResponseDto,
  ProfileListResponseDto,
} from './dto/profile-response.dto';
import { ImportResultDto } from './dto/import-result.dto';
import { SearchProfilesQueryDto } from './dto/search-query.dto';
import { NlqService } from './utils/nlq-service';
import { Roles } from '@core/decorators/roles.decorator';
import { Role, Profile } from '@prisma/client';
import type { Response, Request } from 'express';

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
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a new profile with idempotency',
    description:
      'Creates a new profile by enriching the name with gender, age, and nationality data. If the profile already exists, returns the existing one.',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile created or retrieved successfully',
    type: ProfileSuccessResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid name parameter' })
  @ApiResponse({
    status: 502,
    description: 'Upstream API error or invalid data',
  })
  async create(
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<ProfileSuccessResponseDto> {
    try {
      const result = await this.profilesService.createProfile(
        createProfileDto.name,
      );

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

  @Get('export')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({
    summary: 'Export profiles to CSV',
    description:
      'Streams a CSV file of profiles based on the provided filters. Requires format=csv.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file streamed successfully',
  })
  async export(
    @Query() query: GetProfilesQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    if (query.format !== 'csv') {
      throw new BadRequestException({
        status: 'error',
        message: 'Query parameter "format=csv" is required for export',
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="profiles_${Date.now()}.csv"`,
    );

    // Get all profiles without pagination for export, but keep filters and sorting
    const { data } = await this.profilesService.findAllProfiles({
      ...query,
      page: 1,
      limit: 1000000, // Effectively "all" for this use case
    });

    const header =
      'id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at\n';
    res.write(header);

    for (const profile of data) {
      const row = [
        profile.id,
        `"${profile.name.replace(/"/g, '""')}"`,
        profile.gender,
        profile.gender_probability,
        profile.age,
        profile.age_group,
        profile.country_id,
        `"${profile.country_name.replace(/"/g, '""')}"`,
        profile.country_probability,
        profile.created_at.toISOString(),
      ].join(',');
      res.write(row + '\n');
    }

    res.end();
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.ANALYST)
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
    @Req() req: Request,
  ): Promise<ProfileListResponseDto> {
    const parsed = this.nlqService.parse(query.q);

    if (Object.keys(parsed).length === 0) {
      throw new BadRequestException({
        status: 'error',
        message: 'Unable to interpret query',
      });
    }
    const result = await this.profilesService.findAllProfiles({
      ...parsed,
      page: query.page,
      limit: query.limit,
    });

    return this.formatPaginatedResponse(result, req);
  }

  @Post('import')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: '/tmp',
        filename: (_req, _file, cb) => cb(null, `csv-import-${Date.now()}.csv`),
      }),
    }),
  )
  @ApiOperation({
    summary: 'Bulk import profiles from a CSV file',
    description:
      'Accepts a multipart CSV upload (up to 500k rows). File is written to disk and streamed line-by-line — never fully loaded into memory. Invalid or duplicate rows are skipped. Returns a summary.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Import completed',
    type: ImportResultDto,
  })
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException({
        status: 'error',
        message:
          'A CSV file is required. Send it as multipart/form-data with field name "file".',
      });
    }
    return this.profilesService.importFromCsv(file.path);
  }

  /**
   * Retrieves a profile by its ID.
   *
   * @param id - The unique identifier of the profile.
   * @returns A promise that resolves to the found profile.
   * @throws {NotFoundException} If the profile is not found.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.ANALYST)
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
  @Roles(Role.ADMIN, Role.ANALYST)
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
    @Req() req: Request,
  ): Promise<ProfileListResponseDto> {
    const result = await this.profilesService.findAllProfiles(query);
    return this.formatPaginatedResponse(result, req);
  }

  /**
   * Deletes a profile by its ID.
   *
   * @param id - The unique identifier of the profile to delete.
   * @returns A promise that resolves when the profile is deleted.
   * @throws {NotFoundException} If the profile is not found.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
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

  private formatPaginatedResponse(
    result: {
      page: number;
      limit: number;
      total: number;
      data: Profile[];
    },
    req: Request,
  ): ProfileListResponseDto {
    const totalPages = Math.ceil(result.total / result.limit);
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;

    const getUrl = (p: number) => {
      const url = new URL(baseUrl);
      // Copy current query params
      const isStringable = (val: unknown): val is string | number | boolean =>
        ['string', 'number', 'boolean'].includes(typeof val);

      for (const [key, value] of Object.entries(req.query)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (isStringable(v)) url.searchParams.append(key, v.toString());
            });
          } else if (isStringable(value)) {
            url.searchParams.set(key, value.toString());
          }
        }
      }
      url.searchParams.set('page', p.toString());
      url.searchParams.set('limit', result.limit.toString());
      return url.pathname + url.search;
    };

    return {
      status: 'success',
      page: result.page,
      limit: result.limit,
      total: result.total,
      total_pages: totalPages,
      links: {
        self: getUrl(result.page),
        next: result.page < totalPages ? getUrl(result.page + 1) : null,
        prev: result.page > 1 ? getUrl(result.page - 1) : null,
      },
      data: result.data.map((profile) => ({
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
}
