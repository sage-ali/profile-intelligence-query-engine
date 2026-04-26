// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { uuidv7 } from 'uuidv7';
import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL;

if (typeof dbUrl !== 'string' || dbUrl.trim() === '') {
  throw new Error('DATABASE_URL environment variable is missing.');
}

const adapter = new PrismaPg(dbUrl);
const prisma = new PrismaClient({ adapter });

type SeedProfile = {
  id: string;
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
  created_at?: string;
};

type SeedAdmin = {
  githubId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ANALYST';
};

async function main() {
  // Seed Profiles
  const profilePath = path.join(process.cwd(), 'prisma', 'seed_profiles.json');
  const profileRaw = await readFile(profilePath, 'utf-8');
  const { profiles } = JSON.parse(profileRaw) as { profiles: SeedProfile[] };

  // Seed Admin User
  const adminPath = path.join(process.cwd(), 'prisma', 'admin_seed.json');
  const adminRaw = await readFile(adminPath, 'utf-8');
  const adminData = JSON.parse(adminRaw) as SeedAdmin;

  for (const profile of profiles) {
    const normalizedName = profile.name.toLowerCase().trim();
    const id = profile.id || uuidv7();
    await prisma.profile.upsert({
      where: { name: normalizedName },
      update: {
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_name: profile.country_name,
        country_probability: profile.country_probability,
      },
      create: {
        id,
        name: normalizedName,
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_name: profile.country_name,
        country_probability: profile.country_probability,
        created_at: profile.created_at
          ? new Date(profile.created_at)
          : undefined,
      },
    });
  }

  // Seed the admin user
  await prisma.user.upsert({
    where: { githubId: adminData.githubId },
    update: {
      name: adminData.name,
      email: adminData.email,
      role: adminData.role,
    },
    create: {
      id: uuidv7(),
      githubId: adminData.githubId,
      name: adminData.name.toLowerCase().trim(),
      email: adminData.email,
      role: adminData.role,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
