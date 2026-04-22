import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { GetProfilesQueryDto } from './dto/get-profiles-query.dto';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: ProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: {
            createProfile: vi.fn(),
            findProfileById: vi.fn(),
            findAllProfiles: vi.fn(),
            deleteProfile: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new profile and return 201', async () => {
      const createProfileDto: CreateProfileDto = { name: 'peter' };
      const mockProfile = {
        id: 'test-uuid-v7',
        name: 'peter',
        gender: 'male',
        gender_probability: 0.99,
        sample_size: 100,
        age: 42,
        age_group: 'adult',
        country_id: 'US',
        country_probability: 0.8,
        created_at: new Date(),
      };

      vi.mocked(service.createProfile).mockResolvedValue({
        existing: false,
        profile: mockProfile,
      });

      const result = await controller.create(createProfileDto);

      expect(result).toEqual({
        status: 'success',
        data: {
          id: mockProfile.id,
          name: mockProfile.name,
          gender: mockProfile.gender,
          gender_probability: mockProfile.gender_probability,
          sample_size: mockProfile.sample_size,
          age: mockProfile.age,
          age_group: mockProfile.age_group,
          country_id: mockProfile.country_id,
          country_probability: mockProfile.country_probability,
          created_at: mockProfile.created_at,
        },
      });
      expect(service.createProfile).toHaveBeenCalledWith('peter');
    });

    it('should return existing profile with message when profile exists', async () => {
      const createProfileDto: CreateProfileDto = { name: 'peter' };
      const mockProfile = {
        id: 'existing-id',
        name: 'peter',
        gender: 'male',
        gender_probability: 0.99,
        sample_size: 100,
        age: 42,
        age_group: 'adult',
        country_id: 'US',
        country_probability: 0.8,
        created_at: new Date(),
      };

      vi.mocked(service.createProfile).mockResolvedValue({
        existing: true,
        profile: mockProfile,
      });

      const result = await controller.create(createProfileDto);

      expect(result).toEqual({
        status: 'success',
        message: 'Profile already exists',
        data: {
          id: mockProfile.id,
          name: mockProfile.name,
          gender: mockProfile.gender,
          gender_probability: mockProfile.gender_probability,
          sample_size: mockProfile.sample_size,
          age: mockProfile.age,
          age_group: mockProfile.age_group,
          country_id: mockProfile.country_id,
          country_probability: mockProfile.country_probability,
          created_at: mockProfile.created_at,
        },
      });
      expect(service.createProfile).toHaveBeenCalledWith('peter');
    });
  });

  describe('findById', () => {
    it('should return a profile by ID', async () => {
      const mockProfile = {
        id: 'test-id',
        name: 'peter',
        gender: 'male',
        gender_probability: 0.99,
        sample_size: 100,
        age: 42,
        age_group: 'adult',
        country_id: 'US',
        country_probability: 0.8,
        created_at: new Date(),
      };

      vi.mocked(service.findProfileById).mockResolvedValue(mockProfile);

      const result = await controller.findById('test-id');

      expect(result).toEqual({
        status: 'success',
        data: {
          id: mockProfile.id,
          name: mockProfile.name,
          gender: mockProfile.gender,
          gender_probability: mockProfile.gender_probability,
          sample_size: mockProfile.sample_size,
          age: mockProfile.age,
          age_group: mockProfile.age_group,
          country_id: mockProfile.country_id,
          country_probability: mockProfile.country_probability,
          created_at: mockProfile.created_at,
        },
      });
      expect(service.findProfileById).toHaveBeenCalledWith('test-id');
    });

    it('should throw error when profile not found', async () => {
      vi.mocked(service.findProfileById).mockResolvedValue(null);

      await expect(controller.findById('non-existent-id')).rejects.toThrow(
        'Profile not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return all profiles without filters', async () => {
      const mockProfiles = [
        {
          id: 'id-1',
          name: 'peter',
          gender: 'male',
          gender_probability: 0.99,
          sample_size: 100,
          age: 42,
          age_group: 'adult',
          country_id: 'US',
          country_probability: 0.8,
          created_at: new Date(),
        },
        {
          id: 'id-2',
          name: 'sarah',
          gender: 'female',
          gender_probability: 0.95,
          sample_size: 200,
          age: 28,
          age_group: 'adult',
          country_id: 'NG',
          country_probability: 0.85,
          created_at: new Date(),
        },
      ];

      vi.mocked(service.findAllProfiles).mockResolvedValue({
        count: 2,
        data: mockProfiles,
      });

      const query = new GetProfilesQueryDto();
      const result = await controller.findAll(query);

      expect(result).toEqual({
        status: 'success',
        count: 2,
        data: mockProfiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          gender: profile.gender,
          gender_probability: profile.gender_probability,
          sample_size: profile.sample_size,
          age: profile.age,
          age_group: profile.age_group,
          country_id: profile.country_id,
          country_probability: profile.country_probability,
          created_at: profile.created_at,
        })),
      });
      expect(service.findAllProfiles).toHaveBeenCalledWith({});
    });

    it('should filter profiles by gender', async () => {
      const mockProfiles = [
        {
          id: 'id-1',
          name: 'peter',
          gender: 'male',
          gender_probability: 0.99,
          sample_size: 100,
          age: 42,
          age_group: 'adult',
          country_id: 'US',
          country_probability: 0.8,
          created_at: new Date(),
        },
      ];

      vi.mocked(service.findAllProfiles).mockResolvedValue({
        count: 1,
        data: mockProfiles,
      });

      const query = new GetProfilesQueryDto();
      query.gender = 'male';
      const result = await controller.findAll(query);

      expect(result.count).toBe(1);
      expect(service.findAllProfiles).toHaveBeenCalledWith({
        gender: 'male',
      });
    });
  });

  describe('delete', () => {
    it('should delete a profile by ID', async () => {
      const mockProfile = {
        id: 'test-id',
        name: 'peter',
        gender: 'male',
        gender_probability: 0.99,
        sample_size: 100,
        age: 42,
        age_group: 'adult',
        country_id: 'US',
        country_probability: 0.8,
        created_at: new Date(),
      };

      vi.mocked(service.deleteProfile).mockResolvedValue(mockProfile);

      const result = await controller.delete('test-id');

      expect(result).toBeUndefined();
      expect(service.deleteProfile).toHaveBeenCalledWith('test-id');
    });
  });
});
