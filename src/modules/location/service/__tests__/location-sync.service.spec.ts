import { Test, TestingModule } from '@nestjs/testing';
import { LocationSyncService } from '../location-sync.service';
import { LocationFetchService } from '../location-fetch.service';
import { LocationService } from '../location.service';
import { LocationSyncChangelogService } from '../location-sync-changelog.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { LocationSyncChangeLogStatus } from '../../enum/location-sync-changelog-status.enum';
import { MiiCodesystemLocationDto } from '../../dto/mii-codesystem-location.dto';

describe('LocationSyncService', () => {
  let service: LocationSyncService;
  let fetchService: LocationFetchService;
  let locationService: LocationService;
  let changelogService: LocationSyncChangelogService;

  const mockUser = { userId: 'u1', singleKnownRole: Role.FdpgMember } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationSyncService,
        {
          provide: LocationFetchService,
          useValue: { fetchLocationsFromApi: jest.fn() },
        },
        {
          provide: LocationService,
          useValue: {
            findAllDocuments: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: LocationSyncChangelogService,
          useValue: {
            generateLocationSyncChangelogsFromApi: jest.fn(),
            updateStatus: jest.fn(),
            modelToDto: jest.fn((m) => m),
          },
        },
      ],
    }).compile();

    service = module.get<LocationSyncService>(LocationSyncService);
    fetchService = module.get<LocationFetchService>(LocationFetchService);
    locationService = module.get<LocationService>(LocationService);
    changelogService = module.get<LocationSyncChangelogService>(LocationSyncChangelogService);

    jest.clearAllMocks();
  });

  describe('syncLocations', () => {
    it('should fetch data, process version chains, and call changelog generator', async () => {
      // Arrange
      const mockDbLocations = [{ _id: 'loc-1' }];
      (locationService.findAllDocuments as jest.Mock).mockResolvedValue(mockDbLocations);

      // Setup Chain: A -> B -> C
      // A is replaced by B, B replaces A and is replaced by C, C replaces B.
      const apiLocations: Partial<MiiCodesystemLocationDto>[] = [
        { code: 'A', replacedBy: 'B' },
        { code: 'B', replaces: 'A', replacedBy: 'C' },
        { code: 'C', replaces: 'B' },
        { code: 'D' }, // Standalone
        { code: 'NoCode' }, // Should be filtered out by .filter(apiLoc => apiLoc.code)
      ];

      (fetchService.fetchLocationsFromApi as jest.Mock).mockResolvedValue([
        ...apiLocations,
        { name: 'Missing Code' }, // No code property
      ]);

      // Act
      await service.syncLocations();

      // Assert
      expect(locationService.findAllDocuments).toHaveBeenCalled();
      expect(fetchService.fetchLocationsFromApi).toHaveBeenCalled();

      // Check args passed to generateLocationSyncChangelogsFromApi
      const generateCallArgs = (changelogService.generateLocationSyncChangelogsFromApi as jest.Mock).mock.calls[0];
      const resultMap: Map<string, MiiCodesystemLocationDto> = generateCallArgs[0];
      const dbDocs = generateCallArgs[1];

      expect(dbDocs).toBe(mockDbLocations);

      // Chain Verification:
      // 'A' should map to 'C' (Start of chain -> End of chain)
      expect(resultMap.has('A')).toBe(true);
      expect(resultMap.get('A').code).toBe('C');

      // 'D' should map to 'D' (Standalone)
      expect(resultMap.has('D')).toBe(true);
      expect(resultMap.get('D').code).toBe('D');

      // Intermediate entries 'B' and 'C' should not be keys in the final map
      // (The logic iterates all, but skips processed ones. Since the chain starts at A,
      // B and C are processed as part of A's chain)
      expect(resultMap.has('B')).toBe(false);
      expect(resultMap.has('C')).toBe(false);
    });

    it('should handle mixed order chains', async () => {
      // Chain: 1 -> 2 -> 3
      // Provided in random order
      const apiLocations = [
        { code: '3', replaces: '2' },
        { code: '1', replacedBy: '2' },
        { code: '2', replaces: '1', replacedBy: '3' },
      ];
      (fetchService.fetchLocationsFromApi as jest.Mock).mockResolvedValue(apiLocations);
      (locationService.findAllDocuments as jest.Mock).mockResolvedValue([]);

      await service.syncLocations();

      const resultMap = (changelogService.generateLocationSyncChangelogsFromApi as jest.Mock).mock.calls[0][0];

      // Only the start of the chain ('1') should be a key
      expect(resultMap.size).toBe(1);
      expect(resultMap.get('1').code).toBe('3');
    });
  });

  describe('setChangelogStatus', () => {
    const changelogId = 'cl-1';
    const mockDto = { newLocationData: { name: 'New Name' } } as any;

    it('should throw ForbiddenException if user is not FDPG Member', async () => {
      const researcher = { ...mockUser, singleKnownRole: Role.Researcher };
      await expect(service.setChangelogStatus(changelogId, mockDto, researcher)).rejects.toThrow(ForbiddenException);
    });

    it('should update status and NOT update location if status is REJECTED', async () => {
      const rejectedLog = { ...mockDto, status: LocationSyncChangeLogStatus.DECLINED };
      (changelogService.updateStatus as jest.Mock).mockResolvedValue(rejectedLog);

      const result = await service.setChangelogStatus(changelogId, mockDto, mockUser);

      expect(changelogService.updateStatus).toHaveBeenCalledWith(changelogId, mockDto, mockUser);
      expect(locationService.update).not.toHaveBeenCalled();
      expect(result).toBe(rejectedLog);
    });

    it('should update status and UPDATE location if status is APPROVED', async () => {
      const approvedLog = {
        ...mockDto,
        status: LocationSyncChangeLogStatus.APPROVED,
        forCode: 'loc-code',
      };
      (changelogService.updateStatus as jest.Mock).mockResolvedValue(approvedLog);

      const result = await service.setChangelogStatus(changelogId, mockDto, mockUser);

      expect(changelogService.updateStatus).toHaveBeenCalledWith(changelogId, mockDto, mockUser);
      expect(locationService.update).toHaveBeenCalledWith('loc-code', mockDto.newLocationData);
      expect(result).toBe(approvedLog);
    });
  });
});
