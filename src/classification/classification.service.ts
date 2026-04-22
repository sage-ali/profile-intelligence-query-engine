import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ExternalApiError } from '../errors/ExternalApiError';
import { NoPredictionError } from '../errors/NoPredictionError';
import {
  GenderizeResponse,
  TransformedGenderizeResponse,
} from './types/genderize.types';

/**
 * Service for classifying names into gender predictions using external APIs.
 */
@Injectable()
export class ClassificationService {
  private readonly GENDERIZE_API_TIMEOUT_MS = 5000;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Predicts the gender of a given name.
   *
   * @param name - The name to classify.
   * @returns A promise that resolves to the transformed genderize response.
   * @throws {ExternalApiError} If the external API fails or returns invalid data.
   */
  async getClassification(name: string): Promise<TransformedGenderizeResponse> {
    const url = new URL('https://api.genderize.io');
    url.searchParams.set('name', name);

    try {
      const response = await firstValueFrom(
        this.httpService.get<GenderizeResponse>(url.toString(), {
          timeout: this.GENDERIZE_API_TIMEOUT_MS,
        }),
      );

      const data = response.data;

      // Check for inconclusive prediction BEFORE transformations
      if (data.gender === null || data.count === 0) {
        throw new ExternalApiError(
          'Genderize returned an invalid response',
          502,
        );
      }

      // Apply transformations
      const sample_size = data.count;
      const is_confident =
        data.probability !== null &&
        data.probability >= 0.7 &&
        sample_size >= 100;
      const processed_at = new Date().toISOString();

      return {
        name: data.name,
        gender: data.gender,
        probability: data.probability,
        sample_size: sample_size,
        is_confident: is_confident,
        processed_at: processed_at,
      };
    } catch (error: unknown) {
      if (
        error instanceof NoPredictionError ||
        error instanceof ExternalApiError
      ) {
        throw error;
      }

      if (error instanceof AxiosError) {
        if (
          error.code === 'ECONNABORTED' ||
          error.message?.includes('timeout')
        ) {
          throw new ExternalApiError('Upstream or server failure', 504);
        }

        if (error.response) {
          throw new ExternalApiError(
            'Genderize returned an invalid response',
            502,
          );
        } else if (error.request) {
          throw new ExternalApiError('Upstream or server failure', 502);
        }
      }

      throw new ExternalApiError('Upstream or server failure', 502);
    }
  }
}
