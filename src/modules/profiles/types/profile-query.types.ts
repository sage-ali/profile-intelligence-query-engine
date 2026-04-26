import { Prisma } from '@prisma/client';

export const PROFILE_SORT_FIELDS = [
  'created_at',
  'age',
  'gender_probability',
  'country_probability',
  'name',
] as const;

export type ProfileSortField = (typeof PROFILE_SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export type BuildProfileQueryInput = {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
  page?: number;
  limit?: number;
  sort_by?: ProfileSortField;
  order?: SortOrder;
};

export type BuiltProfileQuery = {
  where: Prisma.ProfileWhereInput;
  orderBy: Prisma.ProfileOrderByWithRelationInput;
  skip: number;
  take: number;
  page: number;
  limit: number;
};

export type ParsedProfileQuery = {
  gender?: 'male' | 'female';
  age_group?: 'child' | 'teenager' | 'adult' | 'senior';
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
  page?: number;
  limit?: number;
  sort_by?: 'age' | 'created_at' | 'gender_probability';
  order?: 'asc' | 'desc';
};
