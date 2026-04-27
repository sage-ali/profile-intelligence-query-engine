import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new user in the database.
   */
  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        githubId: data.githubId,
        email: data.email,
        name: data.name,
        role: data.role,
      },
    });
  }

  /**
   * Finds a single user by their unique GitHub ID.
   */
  async findByGithubId(githubId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { githubId },
    });
  }

  /**
   * Finds a single user by their primary UUID.
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a user by GitHub ID, or creates one if they don't exist.
   */
  async findOrCreateByGithub(data: {
    githubId: string;
    email?: string;
    name?: string;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { githubId: data.githubId },
      update: {
        email: data.email,
        name: data.name,
      },
      create: {
        githubId: data.githubId,
        email: data.email,
        name: data.name,
      },
    });
  }
}
