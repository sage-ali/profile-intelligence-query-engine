import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { User } from '@prisma/client';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new user in the database.
   */
  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        id: uuidv7(),
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
    username?: string;
    avatarUrl?: string;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { githubId: data.githubId },
      update: {
        email: data.email,
        name: data.name,
        username: data.username,
        avatarUrl: data.avatarUrl,
      },
      create: {
        id: uuidv7(),
        githubId: data.githubId,
        email: data.email,
        name: data.name,
        username: data.username,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
