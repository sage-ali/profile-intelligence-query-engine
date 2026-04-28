import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Prisma, Profile } from '@prisma/client';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(name: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { name },
    });
  }

  async findById(id: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { id },
    });
  }

  async create(data: Omit<Prisma.ProfileCreateInput, 'id'>): Promise<Profile> {
    return this.prisma.profile.create({
      data: {
        ...data,
        id: uuidv7(),
      },
    });
  }

  async count(where: Prisma.ProfileWhereInput): Promise<number> {
    return this.prisma.profile.count({ where });
  }

  async findMany(params: {
    where?: Prisma.ProfileWhereInput;
    orderBy?: Prisma.ProfileOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Profile[]> {
    const { where, orderBy, skip, take } = params;
    return this.prisma.profile.findMany({
      where,
      orderBy,
      skip,
      take,
    });
  }

  async delete(id: string): Promise<Profile> {
    return this.prisma.profile.delete({
      where: { id },
    });
  }
}
