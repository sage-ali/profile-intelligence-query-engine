import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Role, User } from '@prisma/client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUser: User = {
    id: 'uuid-123',
    githubId: '12345',
    email: 'test@example.com',
    name: 'Test User',
    role: Role.ANALYST,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    create: vi.fn(),
    findByGithubId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = {
        githubId: '12345',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockUserService.create.mockResolvedValue(mockUser);

      const result = await controller.create(dto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      mockUserService.findByGithubId.mockResolvedValue(mockUser);

      const result = await controller.findOne('12345');

      expect(result).toEqual(mockUser);
      expect(service.findByGithubId).toHaveBeenCalledWith('12345');
    });
  });
});
