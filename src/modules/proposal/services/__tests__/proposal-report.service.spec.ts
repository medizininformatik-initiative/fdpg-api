import { Test, TestingModule } from '@nestjs/testing';
import { AzureStorageService } from 'src/modules/azure-storage/azure-storage.service';
import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ReportCreateDto, ReportUpdateDto } from '../../dto/proposal/report.dto';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { UseCaseUpload } from '../../enums/upload-type.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { addReport, addReportUpload, getBlobName } from '../../utils/proposal.utils';
import { ProposalCrudService } from '../proposal-crud.service';
import { ProposalReportService } from '../proposal-report.service';
import { Upload } from '../../schema/sub-schema/upload.schema';
import { Report } from '../../schema/sub-schema/report.schema';
import { getError } from 'test/get-error';
import { NotFoundException } from '@nestjs/common';

jest.mock('../../utils/proposal.utils', () => ({
  addReport: jest.fn(),
  addReportUpload: jest.fn().mockImplementation((report, upload) => {
    report.uploads.push(upload);
  }),
  getBlobName: jest.fn().mockReturnValue('blobName'),
}));

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn().mockImplementation((cls, plain, options) => plain),
    plainToInstance: jest.fn().mockImplementation((cls, plain, options) => plain),
  };
});

const request = {
  user: {
    userId: 'userId',
    firstName: 'firstName',
    lastName: 'lastName',
    fullName: 'fullName',
    email: 'info@appsfactory.de',
    username: 'username',
    email_verified: true,
    roles: [Role.Researcher],
    singleKnownRole: Role.Researcher,
    miiLocation: MiiLocation.UKL,
    isFromLocation: false,
    isKnownLocation: true,
  },
} as FdpgRequest;

const proposalId = 'proposalId';

const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.FdpgCheck,
};

const getProposalDocument = () => {
  const proposalDocument = {
    ...proposalContent,
    save: jest.fn().mockImplementation(function () {
      return {
        ...this,
      };
    }),
    set: jest.fn(),
  };
  return proposalDocument as any as ProposalDocument;
};

describe('ProposalReportService', () => {
  let proposalReportService: ProposalReportService;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let eventEngineService: jest.Mocked<EventEngineService>;
  let azureStorageService: jest.Mocked<AzureStorageService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalReportService,
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: EventEngineService,
          useValue: {
            handleProposalReportCreate: jest.fn(),
            handleProposalReportUpdate: jest.fn(),
            handleProposalReportDelete: jest.fn(),
          },
        },
        {
          provide: AzureStorageService,
          useValue: {
            uploadFile: jest.fn(),
            deleteManyBlobs: jest.fn(),
            getSasUrl: jest.fn().mockReturnValue('downloadUrl'),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalReportService = module.get<ProposalReportService>(ProposalReportService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    eventEngineService = module.get<EventEngineService>(EventEngineService) as jest.Mocked<EventEngineService>;
    azureStorageService = module.get<AzureStorageService>(AzureStorageService) as jest.Mocked<AzureStorageService>;
  });

  it('should be defined', () => {
    expect(proposalReportService).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a report', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.reports = [];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const reportCreateDto = new ReportCreateDto();
      reportCreateDto.title = 'title';
      reportCreateDto.content = 'content';

      const file = {
        fieldname: 'file',
        originalname: 'file',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        size: 0,
      } as any as Express.Multer.File;
      const files = [file];

      const result = await proposalReportService.createReport(proposalId, reportCreateDto, files, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(
        proposalId,
        request.user,
        { projectAbbreviation: 1, reports: 1, owner: 1 },
        true,
      );

      expect(result.title).toBe('title');
      expect(result.uploads[0].downloadUrl).toBe('downloadUrl');
      expect(getBlobName).toBeCalledWith(proposalId, UseCaseUpload.ReportUpload, result._id);
      expect(azureStorageService.uploadFile).toBeCalledWith('blobName', file, request.user);
      expect(addReportUpload).toBeCalledWith(
        expect.objectContaining({ title: 'title' }),
        expect.objectContaining({ blobName: 'blobName' }),
      );
      expect(addReport).toBeCalledWith(proposalDocument, expect.objectContaining({ title: 'title' }));
      expect(proposalDocument.save).toBeCalledTimes(1);
      expect(eventEngineService.handleProposalReportCreate).toBeCalledWith(
        proposalDocument,
        expect.objectContaining({ title: 'title' }),
      );
      expect(azureStorageService.getSasUrl).toBeCalledWith('blobName', true);
    });
  });

  describe('getAllReports', () => {
    it('should get all reports', async () => {
      const proposalDocument = getProposalDocument();
      const upload = {
        _id: 'uploadId',
        blobName: 'blobName',
        type: UseCaseUpload.ReportUpload,
      } as any as Upload;

      const report = {
        _id: 'reportId',
        title: 'title',
        content: 'content',
        uploads: [upload],
      } as any as Report;

      proposalDocument.reports = [report];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = {
        'reports._id': 1,
        'reports.uploads': 1,
        'reports.title': 1,
        'reports.createdAt': 1,
        'reports.updatedAt': 1,
      };

      const result = await proposalReportService.getAllReports(proposalId, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, false);

      expect(result[0].title).toBe('title');
      expect(result[0].uploads[0].downloadUrl).toBe('downloadUrl');

      expect(azureStorageService.getSasUrl).toBeCalledWith('blobName', true);
    });
  });

  describe('getReportContent', () => {
    it('should get report content', async () => {
      const proposalDocument = getProposalDocument();
      const reportId = 'reportId';
      const secondReportId = 'secondReportId';
      const report = {
        _id: {
          toString: () => reportId,
        },
        title: 'title',
        content: 'content',
      } as any as Report;

      const secondReport = {
        _id: {
          toString: () => secondReportId,
        },
        title: 'title2',
        content: 'content2',
      } as any as Report;

      proposalDocument.reports = [report, secondReport];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = {
        'reports.content': 1,
        'reports._id': 1,
      };

      const result = await proposalReportService.getReportContent(proposalId, reportId, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, false);

      expect(result).toBe('content');
    });

    it('should throw an error if report does not exist', async () => {
      const proposalDocument = getProposalDocument();
      const reportId = 'reportId';
      const secondReportId = 'secondReportId';
      const notFoundReportId = 'notFoundReportId';
      const report = {
        _id: {
          toString: () => reportId,
        },
        title: 'title',
        content: 'content',
      } as any as Report;

      const secondReport = {
        _id: {
          toString: () => secondReportId,
        },
        title: 'title2',
        content: 'content2',
      } as any as Report;

      proposalDocument.reports = [report, secondReport];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = {
        'reports.content': 1,
        'reports._id': 1,
      };

      const call = proposalReportService.getReportContent(proposalId, notFoundReportId, request.user);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, false);
    });
  });

  describe('updateReport', () => {
    it('should update the report', async () => {
      const proposalDocument = getProposalDocument();
      const reportId = 'reportId';
      const uploadToKeepId = 'uploadToKeepId';
      const updatedTitle = 'updatedTitle';
      const reportUpdateDto = new ReportUpdateDto();
      reportUpdateDto.title = 'updatedTitle';
      reportUpdateDto.content = 'content';
      reportUpdateDto.keepUploads = [uploadToKeepId];

      const report = {
        _id: {
          toString: () => reportId,
        },
        title: 'title',
        content: 'content',
        uploads: [{ _id: uploadToKeepId }],
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as Report;

      proposalDocument.reports = [report];

      const file = {
        fieldname: 'file',
        originalname: 'file',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        size: 0,
      } as any as Express.Multer.File;
      const files = [file];

      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };

      const result = await proposalReportService.updateReport(
        proposalId,
        reportId,
        reportUpdateDto,
        files,
        request.user,
      );

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, true);
      expect(proposalDocument.save).toBeCalledTimes(1);
      expect(eventEngineService.handleProposalReportUpdate).toBeCalledWith(
        expect.objectContaining({ _id: proposalId }),
        expect.objectContaining({ content: 'content' }),
      );
      expect(result.uploads.length).toBe(2);
      expect(result.uploads[0].downloadUrl).toBe('downloadUrl');
      expect(result.uploads[1].downloadUrl).toBe('downloadUrl');
      expect(result.title).toBe(updatedTitle);
    });

    it('should remove uploads', async () => {
      const proposalDocument = getProposalDocument();
      const reportId = 'reportId';
      const uploadToKeepId = 'uploadToKeepId';
      const updatedTitle = 'updatedTitle';
      const reportUpdateDto = new ReportUpdateDto();
      reportUpdateDto.title = 'updatedTitle';
      reportUpdateDto.content = 'content';
      reportUpdateDto.keepUploads = [uploadToKeepId];

      const report = {
        _id: {
          toString: () => reportId,
        },
        title: 'title',
        content: 'content',
        uploads: [
          { _id: uploadToKeepId, blobName: 'keepMe' },
          { _id: 'removeMeId', blobName: 'removeMe' },
        ],
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as Report;

      proposalDocument.reports = [report];

      const file = {
        fieldname: 'file',
        originalname: 'file',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        size: 0,
      } as any as Express.Multer.File;
      const files = [file];

      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };

      const result = await proposalReportService.updateReport(
        proposalId,
        reportId,
        reportUpdateDto,
        files,
        request.user,
      );

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, true);
      expect(proposalDocument.save).toBeCalledTimes(1);
      expect(eventEngineService.handleProposalReportUpdate).toBeCalledWith(
        expect.objectContaining({ _id: proposalId }),
        expect.objectContaining({ content: 'content' }),
      );
      expect(result.uploads.length).toBe(2);
      expect(result.uploads[0].downloadUrl).toBe('downloadUrl');
      expect(result.uploads[1].downloadUrl).toBe('downloadUrl');
      expect(result.title).toBe(updatedTitle);

      expect(azureStorageService.deleteManyBlobs).toBeCalledWith(['removeMe']);
    });

    it('should throw an error if report does not exist', async () => {
      const proposalDocument = getProposalDocument();
      const reportId = 'reportId';
      const notFoundReportId = 'notFoundReportId';

      const reportUpdateDto = new ReportUpdateDto();
      reportUpdateDto.title = 'updatedTitle';
      reportUpdateDto.content = 'content';
      reportUpdateDto.keepUploads = [];

      const report = {
        _id: {
          toString: () => reportId,
        },
        title: 'title',
        content: 'content',
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as Report;

      proposalDocument.reports = [report];

      const file = {
        fieldname: 'file',
        originalname: 'file',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        size: 0,
      } as any as Express.Multer.File;
      const files = [file];

      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };

      const call = proposalReportService.updateReport(
        proposalId,
        notFoundReportId,
        reportUpdateDto,
        files,
        request.user,
      );
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, true);
    });
  });

  describe('deleteReport', () => {
    it('should delete the report', async () => {
      const proposalDocument = getProposalDocument();
      const reportId = 'reportId';
      const report = {
        _id: {
          toString: () => reportId,
        },
        title: 'title',
        content: 'content',
        uploads: [{ _id: 'uploadId', blobName: 'blobName' }],
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as Report;

      proposalDocument.reports = [report];

      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };

      await proposalReportService.deleteReport(proposalId, reportId, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, true);
      expect(proposalDocument.save).toBeCalledTimes(1);
      expect(eventEngineService.handleProposalReportDelete).toBeCalledWith(
        expect.objectContaining({ _id: proposalId }),
        expect.objectContaining({ content: 'content' }),
      );
      expect(azureStorageService.deleteManyBlobs).toBeCalledWith(['blobName']);
    });

    it('should do nothing if report does not exist', async () => {
      const proposalDocument = getProposalDocument();
      const reportId = 'reportId';
      const notFoundReportId = 'notFoundReportId';
      const report = {
        _id: {
          toString: () => reportId,
        },
        title: 'title',
        content: 'content',
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as Report;

      proposalDocument.reports = [report];

      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };

      await proposalReportService.deleteReport(proposalId, notFoundReportId, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, projection, true);

      expect(proposalDocument.save).not.toBeCalled();
      expect(eventEngineService.handleProposalReportDelete).not.toBeCalled();
      expect(azureStorageService.deleteManyBlobs).not.toBeCalled();
    });
  });
});
