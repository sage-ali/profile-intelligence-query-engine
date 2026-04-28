import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  GenderizeResponse,
  AgifyResponse,
  NationalizeResponse,
  EnrichedProfile,
} from './types/profiles.types';
import { buildProfileQuery } from './utils/build-profile-query';
import { BuildProfileQueryInput } from './types/profile-query.types';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Prisma } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { ExternalApiError } from '@core/errors/ExternalApiError';
import { ProfilesRepository } from './repositories/profiles.repository';
import { ConfigService } from '@config/config.service';

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
    private readonly profilesRepository: ProfilesRepository,
    private readonly configService: ConfigService,
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
    const { genderize, agify, nationalize } = this.configService.externalApis;
    const urls = {
      genderize: `${genderize}?name=${name}`,
      agify: `${agify}?name=${name}`,
      nationalize: `${nationalize}?name=${name}`,
    };

    try {
      const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
        this.fetchWithProxy<GenderizeResponse>(urls.genderize),
        this.fetchWithProxy<AgifyResponse>(urls.agify),
        this.fetchWithProxy<NationalizeResponse>(urls.nationalize),
      ]);

      if (!genderizeRes || !agifyRes || !nationalizeRes) {
        throw new ExternalApiError('Profile enrichment failed', 502);
      }

      this.validateResponses(genderizeRes, agifyRes, nationalizeRes);

      return this.transformData(genderizeRes, agifyRes, nationalizeRes);
    } catch (error) {
      if (error instanceof ExternalApiError) {
        throw error;
      }
      this.logger.error(
        { err: error instanceof Error ? error : String(error) },
        'Upstream dependency failure during profile enrichment',
      );
      throw new ExternalApiError('Upstream dependency failure', 502);
    }
  }

  private readonly GENDERIZE_API_TIMEOUT_MS = 5000;

  private async fetchWithProxy<T>(url: string): Promise<T | undefined> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, {
          httpsAgent: this.proxyAgent,
          proxy: false,
          timeout: this.GENDERIZE_API_TIMEOUT_MS,
        }),
      );
      return response.data;
    } catch (error) {
      if (error) {
        const serviceName = url.includes('genderize')
          ? 'Genderize'
          : url.includes('agify')
            ? 'Agify'
            : 'Nationalize';

        throw new ExternalApiError(
          `Failed to fetch from ${serviceName}`,
          502,
          serviceName,
        );
      }
    }
  }

  private validateResponses(
    genderize: GenderizeResponse,
    agify: AgifyResponse,
    nationalize: NationalizeResponse,
  ): void {
    if (genderize.gender === null || genderize.count === 0) {
      throw new ExternalApiError(
        'Genderize returned an invalid response',
        502,
        'Genderize',
      );
    }

    if (agify.age === null) {
      throw new ExternalApiError(
        'Agify returned an invalid response',
        502,
        'Agify',
      );
    }

    if (!nationalize.country || nationalize.country.length === 0) {
      throw new ExternalApiError(
        'Nationalize returned an invalid response',
        502,
        'Nationalize',
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
    const countryName =
      new Intl.DisplayNames(['en'], { type: 'region' }).of(
        topNationality.country_id,
      ) || topNationality.country_id;

    return {
      name: genderize.name,
      gender: genderize.gender as string,
      probability: genderize.probability,
      age: agify.age as number,
      age_group: this.getAgeGroup(agify.age as number),
      top_nationality: {
        country_id: topNationality.country_id,
        country_name: countryName,
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
    const existingProfile =
      await this.profilesRepository.findByName(normalizedName);

    if (existingProfile) {
      return {
        existing: true,
        profile: existingProfile,
      };
    }

    // Enrich profile data
    const enrichedData = await this.enrichProfile(normalizedName);

    if (!enrichedData) {
      throw new ExternalApiError('Failed to enrich profile data', 502);
    }

    // Create new profile
    const newProfile = await this.profilesRepository.create({
      name: normalizedName,
      gender: enrichedData.gender,
      gender_probability: enrichedData.probability || 0,
      age: enrichedData.age,
      age_group: enrichedData.age_group,
      country_id: enrichedData.top_nationality.country_id,
      country_name: enrichedData.top_nationality.country_name,
      country_probability: enrichedData.top_nationality.probability,
      created_at: new Date(),
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
    return this.profilesRepository.findById(id);
  }

  /**
   * Retrieves all profiles with optional filtering.
   *
   * @param filters - An object containing optional filters for gender, country_id, and age_group.
   * @returns A promise that resolves to an object containing the total count and the list of profiles.
   */
  async findAllProfiles(query: BuildProfileQueryInput) {
    const { where, orderBy, skip, take, page, limit } =
      buildProfileQuery(query);

    const [total, data] = await Promise.all([
      this.profilesRepository.count(where),
      this.profilesRepository.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
    ]);

    return {
      page,
      limit,
      total,
      data,
    };
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
      return await this.profilesRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }
}
