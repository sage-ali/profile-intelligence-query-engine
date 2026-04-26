import { Prisma } from '@prisma/client';
import {
  BuildProfileQueryInput,
  BuiltProfileQuery,
  ProfileSortField,
} from '../types/profile-query.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT_BY: ProfileSortField = 'created_at';
const DEFAULT_ORDER: Prisma.SortOrder = 'desc';

export function buildProfileQuery(
  input: BuildProfileQueryInput,
): BuiltProfileQuery {
  const where: Prisma.ProfileWhereInput = {};

  if (input.gender) {
    where.gender = input.gender.toLowerCase();
  }

  if (input.age_group) {
    where.age_group = input.age_group.toLowerCase();
  }

  if (input.country_id) {
    where.country_id = input.country_id.toUpperCase();
  }

  if (input.min_age !== undefined || input.max_age !== undefined) {
    where.age = {
      ...(input.min_age !== undefined ? { gte: input.min_age } : {}),
      ...(input.max_age !== undefined ? { lte: input.max_age } : {}),
    };
  }

  if (input.min_gender_probability !== undefined) {
    where.gender_probability = {
      gte: input.min_gender_probability,
    };
  }

  if (input.min_country_probability !== undefined) {
    where.country_probability = {
      gte: input.min_country_probability,
    };
  }

  const page = input.page ?? DEFAULT_PAGE;
  const limit = input.limit ?? DEFAULT_LIMIT;
  const sortBy = input.sort_by ?? DEFAULT_SORT_BY;
  const order = input.order ?? DEFAULT_ORDER;

  const orderBy: Prisma.ProfileOrderByWithRelationInput = {
    [sortBy]: order,
  };

  const skip = (page - 1) * limit;
  const take = limit;

  return {
    where,
    orderBy,
    skip,
    take,
    page,
    limit,
  };
}
