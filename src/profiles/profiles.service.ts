import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenderizeResponse,
  AgifyResponse,
  NationalizeResponse,
  EnrichedProfile,
} from './types/profiles.types';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { uuidv7 } from 'uuidv7';
import { Prisma } from '@prisma/client';
import { Logger } from 'nestjs-pino';

// Check it here, outside the class
const PROXY_URL = process.env.PROXY_URL;

/**
 * Service responsible for managing user profiles, including data enrichment from external APIs.
 */
@Injectable()
export class ProfilesService {
  private readonly proxyAgent = PROXY_URL
    ? new HttpsProxyAgent(PROXY_URL)
    : undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    @Inject(Logger) private readonly logger: Logger,
  ) {}

  /**
   * Enriches a profile name with gender, age, and nationality data from external APIs.
   *
   * @param name - The name to enrich.
   * @returns A promise that resolves to the enriched profile data or undefined.
   * @throws {HttpException} If an external API returns an invalid response or fails.
   */
  async enrichProfile(name: string): Promise<EnrichedProfile | undefined> {
    const urls = {
      genderize: `https://api.genderize.io?name=${name}`,
      agify: `https://api.agify.io?name=${name}`,
      nationalize: `https://api.nationalize.io?name=${name}`,
    };

    try {
      const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
        this.fetchWithProxy<GenderizeResponse>(urls.genderize),
        this.fetchWithProxy<AgifyResponse>(urls.agify),
        this.fetchWithProxy<NationalizeResponse>(urls.nationalize),
      ]);

      this.validateResponses(genderizeRes, agifyRes, nationalizeRes);

      return this.transformData(genderizeRes, agifyRes, nationalizeRes);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        { err: error instanceof Error ? error : String(error) },
        'Upstream dependency failure during profile enrichment',
      );
      throw new HttpException(
        'Upstream dependency failure',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private readonly GENDERIZE_API_TIMEOUT_MS = 5000;

  private async fetchWithProxy<T>(url: string): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.get<T>(url, {
        httpsAgent: this.proxyAgent,
        proxy: false,
        timeout: this.GENDERIZE_API_TIMEOUT_MS,
      }),
    );
    return response.data;
  }

  private validateResponses(
    genderize: GenderizeResponse,
    agify: AgifyResponse,
    nationalize: NationalizeResponse,
  ): void {
    if (genderize.gender === null || genderize.count === 0) {
      throw new HttpException(
        'Genderize returned an invalid response',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (agify.age === null) {
      throw new HttpException(
        'Agify returned an invalid response',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!nationalize.country || nationalize.country.length === 0) {
      throw new HttpException(
        'Nationalize returned an invalid response',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private transformData(
    genderize: GenderizeResponse,
    agify: AgifyResponse,
    nationalize: NationalizeResponse,
  ): EnrichedProfile {
    const sortedCountries = [...nationalize.country].sort(
      (a, b) => b.probability - a.probability,
    );

    const topNationality = sortedCountries[0];

    return {
      name: genderize.name,
      gender: genderize.gender as string,
      probability: genderize.probability,
      sample_size: genderize.count,
      age: agify.age as number,
      age_group: this.getAgeGroup(agify.age as number),
      top_nationality: {
        country_id: topNationality.country_id,
        probability: topNationality.probability,
      },
      countries: sortedCountries,
    };
  }

  private getAgeGroup(age: number): 'child' | 'teenager' | 'adult' | 'senior' {
    if (age <= 12) return 'child';
    if (age <= 19) return 'teenager';
    if (age <= 59) return 'adult';
    return 'senior';
  }

  /**
   * Creates a new profile or returns an existing one if the name already exists.
   *
   * @param name - The name of the profile to create.
   * @returns A promise that resolves to an object containing the profile and whether it already existed.
   * @throws {HttpException} If profile enrichment fails.
   */
  async createProfile(name: string) {
    // Normalize name to lowercase
    const normalizedName = name.toLowerCase();

    // Check for existing profile (idempotency)
    const existingProfile = await this.prisma.profile.findUnique({
      where: { name: normalizedName },
    });

    if (existingProfile) {
      return {
        existing: true,
        profile: existingProfile,
      };
    }

    // Enrich profile data
    const enrichedData = await this.enrichProfile(normalizedName);

    if (!enrichedData) {
      throw new HttpException(
        'Failed to enrich profile data',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Generate UUID v7
    const id = uuidv7();

    // Create new profile
    const newProfile = await this.prisma.profile.create({
      data: {
        id,
        name: normalizedName,
        gender: enrichedData.gender,
        gender_probability: enrichedData.probability || 0,
        sample_size: enrichedData.sample_size,
        age: enrichedData.age,
        age_group: enrichedData.age_group,
        country_id: enrichedData.top_nationality.country_id,
        country_probability: enrichedData.top_nationality.probability,
        created_at: new Date(),
      },
    });

    return {
      existing: false,
      profile: newProfile,
    };
  }

  /**
   * Finds a profile by its unique identifier.
   *
   * @param id - The UUID of the profile.
   * @returns A promise that resolves to the profile or null if not found.
   */
  async findProfileById(id: string) {
    return this.prisma.profile.findUnique({
      where: { id },
    });
  }

  /**
   * Retrieves all profiles with optional filtering.
   *
   * @param filters - An object containing optional filters for gender, country_id, and age_group.
   * @returns A promise that resolves to an object containing the total count and the list of profiles.
   */
  async findAllProfiles(filters: {
    gender?: string;
    country_id?: string;
    age_group?: string;
  }) {
    const where: Prisma.ProfileWhereInput = {};

    if (filters.gender) {
      where.gender = filters.gender.toLowerCase();
    }

    if (filters.country_id) {
      where.country_id = filters.country_id.toUpperCase();
    }

    if (filters.age_group) {
      where.age_group = filters.age_group.toLowerCase();
    }

    const [count, data] = await Promise.all([
      this.prisma.profile.count({ where }),
      this.prisma.profile.findMany({
        where,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return { count, data };
  }

  /**
   * Deletes a profile by its unique identifier.
   *
   * @param id - The UUID of the profile to delete.
   * @returns A promise that resolves to the deleted profile.
   * @throws {NotFoundException} If the profile does not exist.
   */
  async deleteProfile(id: string) {
    try {
      return await this.prisma.profile.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }
}
