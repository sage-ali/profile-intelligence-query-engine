import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { AuthSession, User } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(data: {
    userId: string;
    clientType: string;
    refreshTokenHash: string;
    refreshTokenFamilyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AuthSession> {
    return this.prisma.authSession.create({
      data: {
        userId: data.userId,
        clientType: data.clientType,
        refreshTokenHash: data.refreshTokenHash,
        refreshTokenFamilyId: data.refreshTokenFamilyId,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        lastUsedAt: new Date(),
      },
    });
  }

  async findSessionByTokenHash(
    hash: string,
  ): Promise<(AuthSession & { user: User }) | null> {
    return this.prisma.authSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
  }

  async revokeSession(id: string): Promise<void> {
    await this.prisma.authSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { refreshTokenFamilyId: familyId },
      data: { revokedAt: new Date() },
    });
  }

  async touchSession(id: string): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  async setReplacementTokenHash(
    id: string,
    replacedByTokenHash: string,
  ): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id },
      data: {
        replacedByTokenHash,
      },
    });
  }
}
