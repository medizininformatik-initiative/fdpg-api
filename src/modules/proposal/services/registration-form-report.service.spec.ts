import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationFormReportService } from './registration-form-report.service';
import { PublicStorageService } from 'src/modules/storage';
import { RegistrationFormCrudService } from './registration-form-crud.service';
import { ProposalType } from '../enums/proposal-type.enum';
import { SyncStatus } from '../enums/sync-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import { ReportCreateDto, ReportUpdateDto } from '../dto/proposal/report.dto';

describe('RegistrationFormReportService', () => {
  let service: RegistrationFormReportService;
  let publicStorageService: PublicStorageService;
  let registrationFormCrudService: RegistrationFormCrudService;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    username: 'testuser',
    roles: [Role.Researcher],
    singleKnownRole: Role.Researcher,
    email_verified: true,
    isFromLocation: false,
    isKnownLocation: false,
    isInactiveLocation: false,
    assignedDataSources: [],
  };

  const mockProposal = {
    _id: 'proposal-123',
    projectAbbreviation: 'TEST-001',
    type: ProposalType.RegisteringForm,
    registerInfo: {
      syncStatus: SyncStatus.Synced,
    },
  };

  const mockRegistration = {
    _id: 'registration-123',
    projectAbbreviation: 'TEST-REG-001',
    reports: [],
    save: jest.fn().mockResolvedValue(undefined),
  };

  const mockPublicStorageService = {
    uploadFile: jest.fn().mockResolvedValue(undefined),
    getPublicUrl: jest.fn().mockResolvedValue('https://example.com/file.pdf'),
    deleteManyBlobs: jest.fn().mockResolvedValue(undefined),
  };

  const mockRegistrationFormCrudService = {
    checkProposalType: jest.fn().mockReturnValue(true),
    getRegistration: jest.fn().mockResolvedValue(mockRegistration),
    setRegistrationOutOfSync: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationFormReportService,
        {
          provide: PublicStorageService,
          useValue: mockPublicStorageService,
        },
        {
          provide: RegistrationFormCrudService,
          useValue: mockRegistrationFormCrudService,
        },
      ],
    }).compile();

    service = module.get<RegistrationFormReportService>(RegistrationFormReportService);
    publicStorageService = module.get<PublicStorageService>(PublicStorageService);
    registrationFormCrudService = module.get<RegistrationFormCrudService>(RegistrationFormCrudService);

    // Clear all mocks before each test
    jest.clearAllMocks();
    mockRegistration.reports = [];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleReportCreate', () => {
    it('should create a report with uploads successfully', async () => {
      const reportCreateDto = new ReportCreateDto();
      reportCreateDto.title = 'Test Report';
      reportCreateDto.content = 'Test Content';

      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const result = await service.handleReportCreate(mockProposal as any, reportCreateDto, [mockFile], mockUser);

      expect(mockRegistrationFormCrudService.checkProposalType).toHaveBeenCalledWith(mockProposal);
      expect(mockRegistrationFormCrudService.getRegistration).toHaveBeenCalled();
      expect(mockPublicStorageService.uploadFile).toHaveBeenCalled();
      expect(mockRegistration.save).toHaveBeenCalled();
      expect(mockRegistrationFormCrudService.setRegistrationOutOfSync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Report');
    });

    it('should return undefined if proposal type check fails', async () => {
      mockRegistrationFormCrudService.checkProposalType.mockReturnValueOnce(false);

      const reportCreateDto = new ReportCreateDto();
      const result = await service.handleReportCreate(mockProposal as any, reportCreateDto, [], mockUser);

      expect(result).toBeUndefined();
      expect(mockRegistrationFormCrudService.getRegistration).not.toHaveBeenCalled();
    });

    it('should handle multiple file uploads', async () => {
      const reportCreateDto = new ReportCreateDto();
      reportCreateDto.title = 'Multi-file Report';

      const mockFiles = [
        {
          originalname: 'test1.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test1'),
        },
        {
          originalname: 'test2.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          buffer: Buffer.from('test2'),
        },
      ] as Express.Multer.File[];

      const result = await service.handleReportCreate(mockProposal as any, reportCreateDto, mockFiles, mockUser);

      expect(mockPublicStorageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should handle upload failures gracefully', async () => {
      const reportCreateDto = new ReportCreateDto();
      reportCreateDto.title = 'Test Report';

      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      mockPublicStorageService.uploadFile.mockRejectedValueOnce(new Error('Upload failed'));

      const result = await service.handleReportCreate(mockProposal as any, reportCreateDto, [mockFile], mockUser);

      expect(result).toBeDefined();
      // Should still save even if upload fails
      expect(mockRegistration.save).toHaveBeenCalled();
    });

    it('should get download URLs for all uploads', async () => {
      const reportCreateDto = new ReportCreateDto();
      reportCreateDto.title = 'Test Report';

      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      await service.handleReportCreate(mockProposal as any, reportCreateDto, [mockFile], mockUser);

      expect(mockPublicStorageService.getPublicUrl).toHaveBeenCalled();
    });
  });

  describe('handleReportUpdate', () => {
    beforeEach(() => {
      mockRegistration.reports = [
        {
          _id: { toString: () => 'report-123' },
          title: 'Original Report',
          description: 'Original Description',
          uploads: [
            {
              _id: { toString: () => 'upload-1' },
              blobName: 'blob-1',
              fileName: 'file1.pdf',
            },
            {
              _id: { toString: () => 'upload-2' },
              blobName: 'blob-2',
              fileName: 'file2.pdf',
            },
          ],
        },
      ];
    });

    it('should update a report successfully', async () => {
      const reportUpdateDto: ReportUpdateDto = {
        title: 'Updated Report',
        content: 'Updated Content',
        keepUploads: ['upload-1'],
      };

      const result = await service.handleReportUpdate(mockProposal as any, 'report-123', reportUpdateDto, [], mockUser);

      expect(mockRegistrationFormCrudService.getRegistration).toHaveBeenCalled();
      expect(mockRegistration.save).toHaveBeenCalled();
      expect(mockRegistrationFormCrudService.setRegistrationOutOfSync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Report');
    });

    it('should return undefined if proposal type check fails', async () => {
      mockRegistrationFormCrudService.checkProposalType.mockReturnValueOnce(false);

      const result = await service.handleReportUpdate(
        mockProposal as any,
        'report-123',
        {} as ReportUpdateDto,
        [],
        mockUser,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined if report not found', async () => {
      const reportUpdateDto: ReportUpdateDto = {
        title: 'Updated Report',
        content: 'Updated Content',
        keepUploads: [],
      };

      const result = await service.handleReportUpdate(
        mockProposal as any,
        'nonexistent-report',
        reportUpdateDto,
        [],
        mockUser,
      );

      expect(result).toBeUndefined();
    });

    it('should remove uploads not in keepUploads list', async () => {
      const reportUpdateDto: ReportUpdateDto = {
        title: 'Updated Report',
        content: 'Updated Content',
        keepUploads: ['upload-1'],
      };

      await service.handleReportUpdate(mockProposal as any, 'report-123', reportUpdateDto, [], mockUser);

      expect(mockPublicStorageService.deleteManyBlobs).toHaveBeenCalledWith(['blob-2']);
    });

    it('should handle no uploads to remove', async () => {
      const reportUpdateDto: ReportUpdateDto = {
        title: 'Updated Report',
        content: 'Updated Content',
        keepUploads: ['upload-1', 'upload-2'],
      };

      await service.handleReportUpdate(mockProposal as any, 'report-123', reportUpdateDto, [], mockUser);

      expect(mockPublicStorageService.deleteManyBlobs).not.toHaveBeenCalled();
    });

    it('should get download URLs for updated uploads', async () => {
      const reportUpdateDto: ReportUpdateDto = {
        title: 'Updated Report',
        content: 'Updated Content',
        keepUploads: ['upload-1'],
      };

      await service.handleReportUpdate(mockProposal as any, 'report-123', reportUpdateDto, [], mockUser);

      expect(mockPublicStorageService.getPublicUrl).toHaveBeenCalled();
    });
  });

  describe('handleReportDelete', () => {
    beforeEach(() => {
      mockRegistration.reports = [
        {
          _id: { toString: () => 'report-123' },
          title: 'Report to Delete',
          uploads: [
            {
              _id: { toString: () => 'upload-1' },
              blobName: 'blob-1',
            },
          ],
        },
      ];
    });

    it('should delete a report successfully', async () => {
      await service.handleReportDelete(mockProposal as any, 'report-123', mockUser);

      expect(mockRegistrationFormCrudService.getRegistration).toHaveBeenCalled();
      expect(mockPublicStorageService.deleteManyBlobs).toHaveBeenCalledWith(['blob-1']);
      expect(mockRegistration.save).toHaveBeenCalled();
      expect(mockRegistrationFormCrudService.setRegistrationOutOfSync).toHaveBeenCalled();
      expect(mockRegistration.reports.length).toBe(0);
    });

    it('should return undefined if proposal type check fails', async () => {
      mockRegistrationFormCrudService.checkProposalType.mockReturnValueOnce(false);

      await service.handleReportDelete(mockProposal as any, 'report-123', mockUser);

      expect(mockRegistrationFormCrudService.getRegistration).not.toHaveBeenCalled();
    });

    it('should return undefined if report not found', async () => {
      await service.handleReportDelete(mockProposal as any, 'nonexistent-report', mockUser);

      expect(mockPublicStorageService.deleteManyBlobs).not.toHaveBeenCalled();
      expect(mockRegistration.save).not.toHaveBeenCalled();
    });

    it('should handle report with no uploads', async () => {
      mockRegistration.reports = [
        {
          _id: { toString: () => 'report-no-uploads' },
          title: 'Report without uploads',
          uploads: [],
        },
      ];

      await service.handleReportDelete(mockProposal as any, 'report-no-uploads', mockUser);

      expect(mockPublicStorageService.deleteManyBlobs).not.toHaveBeenCalled();
      expect(mockRegistration.save).toHaveBeenCalled();
    });
  });

  describe('setRegistrationOutOfSync', () => {
    it('should set sync status to OutOfSync for RegisteringForm', async () => {
      const proposal = {
        type: ProposalType.RegisteringForm,
        registerInfo: {
          syncStatus: SyncStatus.Synced,
        },
      };

      await service.setRegistrationOutOfSync(proposal as any);

      expect(proposal.registerInfo.syncStatus).toBe(SyncStatus.OutOfSync);
    });

    it('should not change sync status for non-RegisteringForm proposals', async () => {
      const proposal = {
        type: ProposalType.ApplicationForm,
        registerInfo: {
          syncStatus: SyncStatus.Synced,
        },
      };

      await service.setRegistrationOutOfSync(proposal as any);

      expect(proposal.registerInfo.syncStatus).toBe(SyncStatus.Synced);
    });
  });
});
