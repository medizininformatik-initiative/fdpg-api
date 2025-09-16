import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from 'src/modules/storage/storage.service';
import { ProposalDownloadService } from '../proposal-download.service';
import { NotFoundException } from '@nestjs/common';

describe('ProposalDownloadService', () => {
  let proposalDownloadService: ProposalDownloadService;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalDownloadService,
        {
          provide: StorageService,
          useValue: {
            blobExists: jest.fn(),
            getObject: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalDownloadService = module.get<ProposalDownloadService>(ProposalDownloadService);
    storageService = module.get<StorageService>(StorageService) as jest.Mocked<StorageService>;
  });

  it('should be defined', () => {
    expect(proposalDownloadService).toBeDefined();
  });

  describe('downloadFile', () => {
    it('should throw NotFoundException when blob does not exist', async () => {
      storageService.blobExists.mockResolvedValue(false);

      await expect(proposalDownloadService.downloadFile('non-existent-blob')).rejects.toThrow(NotFoundException);
      expect(storageService.blobExists).toHaveBeenCalledWith('non-existent-blob');
    });

    it('should download file successfully when blob exists', async () => {
      const mockBuffer = Buffer.from('test file content');
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(mockBuffer);
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      };

      storageService.blobExists.mockResolvedValue(true);
      storageService.getObject.mockResolvedValue(mockStream as any);

      const result = await proposalDownloadService.downloadFile('existing-blob');

      expect(result).toEqual(mockBuffer);
      expect(storageService.blobExists).toHaveBeenCalledWith('existing-blob');
      expect(storageService.getObject).toHaveBeenCalledWith('existing-blob');
    });

    it('should handle stream error', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Stream error'));
          }
          return mockStream;
        }),
      };

      storageService.blobExists.mockResolvedValue(true);
      storageService.getObject.mockResolvedValue(mockStream as any);

      await expect(proposalDownloadService.downloadFile('error-blob')).rejects.toThrow(
        'Failed to stream file error-blob: Stream error',
      );
    });
  });
});
