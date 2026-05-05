import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';
import {
  GenderizeResponse,
  AgifyResponse,
  NationalizeResponse,
  EnrichedProfile,
} from './types/profiles.types';
import { buildProfileQuery } from './utils/build-profile-query';
import { BuildProfileQueryInput } from './types/profile-query.types';
import { normalizeFilters, buildCacheKey } from './utils/normalize-filters';
import { ImportResult } from './types/import-result.types';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Prisma, Profile } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { ExternalApiError } from '@core/errors/ExternalApiError';
import { ProfilesRepository } from './repositories/profiles.repository';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { ConfigService } from '@config/config.service';
import { RedisService } from '@infrastructure/redis/redis.service';

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
    private readonly redisService: RedisService,
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

    await this.invalidateQueryCache();

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
   * Retrieves all profiles with optional filtering, backed by a Redis query cache.
   *
   * Normalizes the filter object before cache key generation so that semantically
   * identical queries (different casing, key order) share one cache entry.
   * TTL is 5 minutes — acceptable staleness for analytics workloads.
   */
  async findAllProfiles(query: BuildProfileQueryInput) {
    const redis = this.redisService.getClient();
    const cacheKey = buildCacheKey(query);

    const cached = await redis.get(cacheKey);
    if (cached) {
      // JSON.parse returns any; cast is safe because the key is built from the
      // same type that was stored, so the shape is guaranteed.
      const parsed = JSON.parse(cached) as {
        page: number;
        limit: number;
        total: number;
        data: Array<Omit<Profile, 'created_at'> & { created_at: string }>;
      };
      return {
        ...parsed,
        data: parsed.data.map((p) => ({
          ...p,
          created_at: new Date(p.created_at),
        })),
      };
    }

    const { where, orderBy, skip, take, page, limit } = buildProfileQuery(
      normalizeFilters(query),
    );

    const [total, data] = await Promise.all([
      this.profilesRepository.count(where),
      this.profilesRepository.findMany({ where, orderBy, skip, take }),
    ]);

    const result = { page, limit, total, data };
    await redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
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
      const deleted = await this.profilesRepository.delete(id);
      await this.invalidateQueryCache();
      return deleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }

  async importFromCsv(buffer: Buffer): Promise<ImportResult> {
    const CHUNK_SIZE = 1000;
    const VALID_GENDERS = new Set(['male', 'female']);
    const stats: ImportResult = {
      status: 'success',
      total_rows: 0,
      inserted: 0,
      skipped: 0,
      reasons: {},
    };

    const bump = (reason: string): void => {
      stats.skipped++;
      stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
    };

    let chunk: Prisma.ProfileCreateManyInput[] = [];

    let isFirstLine = true;
    const lines = Readable.from(buffer.toString('utf-8').split('\n'));

    for await (const raw of lines) {
      const line = String(raw).trim();
      if (!line) continue;

      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }

      stats.total_rows++;

      const columns = this.parseCsvLine(line);
      if (columns === null) {
        bump('malformed_row');
        continue;
      }

      const [name, gender, ageRaw, country_id, country_name] = columns;

      if (!name || !gender || !ageRaw || !country_id || !country_name) {
        bump('missing_fields');
        continue;
      }

      const normalizedGender = gender.toLowerCase();
      if (!VALID_GENDERS.has(normalizedGender)) {
        bump('invalid_gender');
        continue;
      }

      const age = Number(ageRaw);
      if (!Number.isInteger(age) || age < 0) {
        bump('invalid_age');
        continue;
      }

      chunk.push({
        name: name.toLowerCase(),
        gender: normalizedGender,
        gender_probability: 0,
        age,
        age_group: this.getAgeGroup(age),
        country_id: country_id.toUpperCase(),
        country_name,
        country_probability: 0,
        created_at: new Date(),
      });

      if (chunk.length >= CHUNK_SIZE) {
        const inserted = await this.flushChunk(chunk);
        stats.inserted += inserted;
        const duplicates = chunk.length - inserted;
        if (duplicates > 0) {
          stats.reasons['duplicate_name'] =
            (stats.reasons['duplicate_name'] ?? 0) + duplicates;
          stats.skipped += duplicates;
        }
        chunk = [];
      }
    }

    if (chunk.length > 0) {
      const inserted = await this.flushChunk(chunk);
      stats.inserted += inserted;
      const duplicates = chunk.length - inserted;
      if (duplicates > 0) {
        stats.reasons['duplicate_name'] =
          (stats.reasons['duplicate_name'] ?? 0) + duplicates;
        stats.skipped += duplicates;
      }
    }

    await this.invalidateQueryCache();
    return stats;
  }

  private async flushChunk(
    rows: Prisma.ProfileCreateManyInput[],
  ): Promise<number> {
    const result = await this.prisma.profile.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return result.count;
  }

  private parseCsvLine(line: string): string[] | null {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim());

    // Reject lines with wrong column count or encoding issues
    if (columns.length < 5 || columns.some((c) => c.includes('�'))) {
      return null;
    }

    return columns;
  }

  private async invalidateQueryCache(): Promise<void> {
    const redis = this.redisService.getClient();
    const keys = await redis.keys('profiles:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }
}
