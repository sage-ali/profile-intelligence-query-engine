import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  const mockUser: User = {
    id: 'uuid-123',
    githubId: '12345',
    email: 'test@example.com',
    name: 'Test User',
    role: Role.ANALYST,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    create: vi.fn(),
    findByGithubId: vi.fn(),
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user if they do not exist', async () => {
      const dto = {
        githubId: '12345',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockUserRepository.findByGithubId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(dto);

      expect(result).toEqual(mockUser);
      expect(repository.findByGithubId).toHaveBeenCalledWith('12345');
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException if user exists', async () => {
      const dto = { githubId: '12345' };
      mockUserRepository.findByGithubId.mockResolvedValue(mockUser);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByGithubId', () => {
    it('should return a user if found', async () => {
      mockUserRepository.findByGithubId.mockResolvedValue(mockUser);

      const result = await service.findByGithubId('12345');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findByGithubId.mockResolvedValue(null);

      await expect(service.findByGithubId('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
