import { BuildProfileQueryInput } from '../types/profile-query.types';

export function normalizeFilters(
  filters: BuildProfileQueryInput,
): BuildProfileQueryInput {
  const normalized: BuildProfileQueryInput = {};

  if (filters.gender) normalized.gender = filters.gender.toLowerCase();
  if (filters.country_id)
    normalized.country_id = filters.country_id.toLowerCase();
  if (filters.age_group) normalized.age_group = filters.age_group.toLowerCase();
  if (filters.min_age != null) normalized.min_age = Math.floor(filters.min_age);
  if (filters.max_age != null) normalized.max_age = Math.floor(filters.max_age);
  if (filters.min_gender_probability != null)
    normalized.min_gender_probability =
      Math.round(filters.min_gender_probability * 100) / 100;
  if (filters.min_country_probability != null)
    normalized.min_country_probability =
      Math.round(filters.min_country_probability * 100) / 100;
  if (filters.sort_by) normalized.sort_by = filters.sort_by;
  if (filters.order)
    normalized.order = filters.order.toLowerCase() as 'asc' | 'desc';
  if (filters.page != null) normalized.page = filters.page;
  if (filters.limit != null) normalized.limit = filters.limit;

  return normalized;
}

export function buildCacheKey(filters: BuildProfileQueryInput): string {
  const normalized = normalizeFilters(filters);

  const sorted = Object.keys(normalized)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = normalized[key as keyof BuildProfileQueryInput];
      return acc;
    }, {});

  return `profiles:${JSON.stringify(sorted)}`;
}
