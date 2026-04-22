/**
 * Response structure from the Genderize API.
 */
export interface GenderizeResponse {
  /** The name queried. */
  name: string;
  /** The predicted gender. */
  gender: string | null;
  /** The probability of the predicted gender. */
  probability: number | null;
  /** The number of samples used. */
  count: number;
}

/**
 * Response structure from the Agify API.
 */
export interface AgifyResponse {
  /** The name queried. */
  name: string;
  /** The predicted age. */
  age: number | null;
  /** The number of samples used. */
  count: number;
}

/**
 * Represents a country prediction from the Nationalize API.
 */
export interface NationalizeCountry {
  /** The ISO country code. */
  country_id: string;
  /** The probability of the prediction. */
  probability: number;
}

/**
 * Response structure from the Nationalize API.
 */
export interface NationalizeResponse {
  /** The name queried. */
  name: string;
  /** List of predicted countries. */
  country: NationalizeCountry[];
}

/**
 * Represents a profile enriched with data from various external APIs.
 */
export interface EnrichedProfile {
  /** The name of the individual. */
  name: string;
  /** The predicted gender. */
  gender: string;
  /** The probability of the gender prediction. */
  probability: number | null;
  /** The number of samples used for gender prediction. */
  sample_size: number;
  /** The predicted age. */
  age: number;
  /** The category the predicted age falls into. */
  age_group: 'child' | 'teenager' | 'adult' | 'senior';
  /** The most likely nationality. */
  top_nationality: {
    /** The ISO country code. */
    country_id: string;
    /** The probability of the country prediction. */
    probability: number;
  };
  /** List of all predicted nationalities. */
  countries: NationalizeCountry[];
}
