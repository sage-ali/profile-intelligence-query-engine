/**
 * Raw response structure from the Genderize API.
 */
export interface GenderizeResponse {
  /** The number of samples used for prediction. */
  count: number;
  /** The name queried. */
  name: string;
  /** The predicted gender. */
  gender: string | null;
  /** The probability of the gender prediction. */
  probability: number | null;
}

/**
 * Transformed version of the Genderize response for internal use.
 */
export interface TransformedGenderizeResponse {
  /** The name that was processed. */
  name: string;
  /** The predicted gender. */
  gender: string | null;
  /** The probability of the predicted gender. */
  probability: number | null;
  /** The sample size from which the prediction was derived. */
  sample_size: number;
  /** Whether the prediction meets a confidence threshold. */
  is_confident: boolean;
  /** The ISO timestamp when the data was processed. */
  processed_at: string;
}
