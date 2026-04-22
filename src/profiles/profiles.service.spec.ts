import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { vi, describe, it, expect, beforeEach, MockInstance } from 'vitest';
import { Logger } from 'nestjs-pino';
import { HttpException } from '@nestjs/common';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let httpService: HttpService;
  let getSpy: MockInstance; // Reference for our spy

  const mockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: HttpService,
          useValue: {
            get: vi.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            profile: {
              findUnique: vi.fn(),
              create: vi.fn(),
              findMany: vi.fn(),
              count: vi.fn(),
              delete: vi.fn(),
            },
          },
        },
        {
          provide: Logger,
          useValue: {
            error: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    httpService = module.get<HttpService>(HttpService);

    // Attach the spy to the specific instance provided by Nest
    getSpy = vi.spyOn(httpService, 'get');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile', () => {
    it('should create a new profile when it does not exist', async () => {
      const name = 'peter';
      const normalizedName = name.toLowerCase();

      // Mock findUnique to return null (profile doesn't exist)
      const findUniqueMock = vi.fn().mockResolvedValue(null);
      service['prisma'].profile.findUnique = findUniqueMock;

      // Mock enrichProfile to return data
      const enrichedData = {
        name: normalizedName,
        gender: 'male',
        probability: 0.99,
        sample_size: 100,
        age: 42,
        age_group: 'adult' as const,
        top_nationality: { country_id: 'US', probability: 0.8 },
        countries: [{ country_id: 'US', probability: 0.8 }],
      };
      vi.spyOn(service, 'enrichProfile').mockResolvedValue(enrichedData);

      // Mock create to return a profile
      const mockProfile = {
        id: 'test-uuid-v7',
        name: normalizedName,
        gender: 'male',
        gender_probability: 0.99,
        sample_size: 100,
        age: 42,
        age_group: 'adult',
        country_id: 'US',
        country_probability: 0.8,
        created_at: new Date(),
      };
      const createMock = vi.fn().mockResolvedValue(mockProfile);
      service['prisma'].profile.create = createMock;

      const result = await service.createProfile(name);

      expect(result.existing).toBe(false);
      expect(result.profile).toEqual(mockProfile);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { name: normalizedName },
      });
    });

    it('should return existing profile when it already exists', async () => {
      const name = 'peter';
      const normalizedName = name.toLowerCase();

      const existingProfile = {
        id: 'existing-id',
        name: normalizedName,
        gender: 'male',
        gender_probability: 0.99,
        sample_size: 100,
        age: 42,
        age_group: 'adult',
        country_id: 'US',
        country_probability: 0.8,
        created_at: new Date(),
      };

      const findUniqueMock = vi.fn().mockResolvedValue(existingProfile);
      service['prisma'].profile.findUnique = findUniqueMock;

      const result = await service.createProfile(name);

      expect(result.existing).toBe(true);
      expect(result.profile).toEqual(existingProfile);
      expect(service['prisma'].profile.create).not.toHaveBeenCalled();
    });
  });

  describe('findProfileById', () => {
    it('should find a profile by ID', async () => {
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

      const findUniqueMock = vi.fn().mockResolvedValue(mockProfile);
      service['prisma'].profile.findUnique = findUniqueMock;

      const result = await service.findProfileById('test-id');

      expect(result).toEqual(mockProfile);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('should return null when profile not found', async () => {
      const findUniqueMock = vi.fn().mockResolvedValue(null);
      service['prisma'].profile.findUnique = findUniqueMock;

      const result = await service.findProfileById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findAllProfiles', () => {
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

      const countMock = vi.fn().mockResolvedValue(2);
      const findManyMock = vi.fn().mockResolvedValue(mockProfiles);
      service['prisma'].profile.count = countMock;
      service['prisma'].profile.findMany = findManyMock;

      const result = await service.findAllProfiles({});

      expect(result.count).toBe(2);
      expect(result.data).toEqual(mockProfiles);
      expect(countMock).toHaveBeenCalledWith({
        where: {},
      });
      expect(findManyMock).toHaveBeenCalledWith({
        where: {},
        orderBy: { created_at: 'desc' },
      });
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

      const countMock = vi.fn().mockResolvedValue(1);
      const findManyMock = vi.fn().mockResolvedValue(mockProfiles);
      service['prisma'].profile.count = countMock;
      service['prisma'].profile.findMany = findManyMock;

      const result = await service.findAllProfiles({ gender: 'MALE' });

      expect(result.count).toBe(1);
      expect(countMock).toHaveBeenCalledWith({
        where: { gender: 'male' },
      });
    });

    it('should filter profiles by country_id', async () => {
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

      const countMock = vi.fn().mockResolvedValue(1);
      const findManyMock = vi.fn().mockResolvedValue(mockProfiles);
      service['prisma'].profile.count = countMock;
      service['prisma'].profile.findMany = findManyMock;

      const result = await service.findAllProfiles({ country_id: 'us' });

      expect(result.count).toBe(1);
      expect(countMock).toHaveBeenCalledWith({
        where: { country_id: 'US' },
      });
    });

    it('should filter profiles by age_group', async () => {
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

      const countMock = vi.fn().mockResolvedValue(1);
      const findManyMock = vi.fn().mockResolvedValue(mockProfiles);
      service['prisma'].profile.count = countMock;
      service['prisma'].profile.findMany = findManyMock;

      const result = await service.findAllProfiles({ age_group: 'adult' });

      expect(result.count).toBe(1);
      expect(countMock).toHaveBeenCalledWith({
        where: { age_group: 'adult' },
      });
    });
  });

  describe('deleteProfile', () => {
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

      const deleteMock = vi.fn().mockResolvedValue(mockProfile);
      service['prisma'].profile.delete = deleteMock;

      const result = await service.deleteProfile('test-id');

      expect(result).toEqual(mockProfile);
      expect(deleteMock).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });
  });

  describe('enrichProfile', () => {
    it('should return a transformed enriched profile on success', async () => {
      const name = 'peter';
      const genderizeData = {
        name,
        gender: 'male',
        probability: 0.99,
        count: 100,
      };
      const agifyData = { name, age: 42, count: 100 };
      const nationalizeData = {
        name,
        country: [
          { country_id: 'US', probability: 0.8 },
          { country_id: 'CA', probability: 0.2 },
        ],
      };

      // Ensure the mock implementation returns the Observables in order
      getSpy
        .mockReturnValueOnce(of(mockAxiosResponse(genderizeData)))
        .mockReturnValueOnce(of(mockAxiosResponse(agifyData)))
        .mockReturnValueOnce(of(mockAxiosResponse(nationalizeData)));

      const result = await service.enrichProfile(name);

      expect(result).toMatchObject({
        name,
        gender: 'male',
        age: 42,
        age_group: 'adult',
        top_nationality: { country_id: 'US' },
      });
      expect(getSpy).toHaveBeenCalledTimes(3);
    });

    it('should throw 502 if Genderize gender is null', async () => {
      // Provide mocks for ALL THREE calls even though Genderize is first
      getSpy
        .mockReturnValueOnce(of(mockAxiosResponse({ gender: null, count: 0 })))
        .mockReturnValueOnce(of(mockAxiosResponse({ age: 42 }))) // Necessary for Promise.all
        .mockReturnValueOnce(
          of(
            mockAxiosResponse({
              country: [{ country_id: 'US', probability: 1 }],
            }),
          ),
        );

      try {
        await service.enrichProfile('test');
        expect.fail('Should have thrown 502');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(502);
        expect((error as HttpException).message).toMatch(
          /Genderize returned an invalid response/,
        );
      }
    });

    it('should throw 502 if Agify age is null', async () => {
      // Provide mocks for ALL THREE
      getSpy
        .mockReturnValueOnce(
          of(mockAxiosResponse({ name: 'test', gender: 'male', count: 10 })),
        )
        .mockReturnValueOnce(of(mockAxiosResponse({ age: null })))
        .mockReturnValueOnce(
          of(
            mockAxiosResponse({
              country: [{ country_id: 'US', probability: 1 }],
            }),
          ),
        );

      try {
        await service.enrichProfile('test');
        expect.fail('Should have thrown 502');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(502);
        expect((error as HttpException).message).toMatch(
          /Agify returned an invalid response/,
        );
      }
    });

    it('should throw 502 if Nationalize country list is empty', async () => {
      getSpy
        .mockReturnValueOnce(
          of(mockAxiosResponse({ name: 'test', gender: 'male', count: 10 })),
        )
        .mockReturnValueOnce(of(mockAxiosResponse({ age: 42 })))
        .mockReturnValueOnce(of(mockAxiosResponse({ country: [] })));

      try {
        await service.enrichProfile('test');
        expect.fail('Should have thrown 502');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(502);
        expect((error as HttpException).message).toMatch(
          /Nationalize returned an invalid response/,
        );
      }
    });

    it('should assign correct age_group', async () => {
      const cases = [
        { age: 5, group: 'child' },
        { age: 12, group: 'child' },
        { age: 13, group: 'teenager' },
        { age: 19, group: 'teenager' },
        { age: 20, group: 'adult' },
        { age: 25, group: 'adult' },
        { age: 65, group: 'senior' },
      ];

      for (const { age, group } of cases) {
        getSpy.mockClear(); // Reset calls but keep mock implementation logic
        getSpy
          .mockReturnValueOnce(
            of(mockAxiosResponse({ name: 'test', gender: 'male', count: 100 })),
          )
          .mockReturnValueOnce(of(mockAxiosResponse({ age })))
          .mockReturnValueOnce(
            of(
              mockAxiosResponse({
                country: [{ country_id: 'US', probability: 1 }],
              }),
            ),
          );

        const result = await service.enrichProfile('test');
        expect(result?.age_group).toBe(group);
      }
    });
  });
});
