import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PublicStorageService } from '../public-storage.service';
import { NotFoundException } from '@nestjs/common';

describe('PublicStorageService', () => {
  let service: PublicStorageService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        S3_PUBLIC_ENDPOINT: 's3.eu-central-4.ionoscloud.com',
        S3_PUBLIC_PORT: '443',
        S3_PUBLIC_USE_SSL: 'true',
        S3_PUBLIC_BUCKET_NAME: 'fdpg-public-dev',
        S3_PUBLIC_ACCESSKEY: 'test-access-key',
        S3_PUBLIC_SECRETKEY: 'test-secret-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PublicStorageService>(PublicStorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicUrl', () => {
    it('should generate correct public URL', () => {
      const blobName = 'test-file.pdf';
      const url = service.getPublicUrl(blobName);
      expect(url).toBe('https://fdpg-public-dev.s3.eu-central-4.ionoscloud.com/test-file.pdf');
    });

    it('should generate correct public URL with nested path', () => {
      const blobName = 'documents/2024/test-file.pdf';
      const url = service.getPublicUrl(blobName);
      expect(url).toBe('https://fdpg-public-dev.s3.eu-central-4.ionoscloud.com/documents/2024/test-file.pdf');
    });
  });


  describe('uploadFile', () => {
    it('should throw error when upload fails', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        size: 4,
        mimetype: 'text/plain',
        originalname: 'test.txt',
      } as Express.Multer.File;

      // Mock the minioClient.putObject to throw an error
      jest.spyOn(service['minioClient'], 'putObject').mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile('test.txt', mockFile)).rejects.toThrow();
    });
  });

  describe('blobExists', () => {
    it('should return true when blob exists', async () => {
      jest.spyOn(service['minioClient'], 'statObject').mockResolvedValue({} as any);
      const exists = await service.blobExists('test.txt');
      expect(exists).toBe(true);
    });

    it('should return false when blob does not exist', async () => {
      jest.spyOn(service['minioClient'], 'statObject').mockRejectedValue(new Error('Not found'));
      const exists = await service.blobExists('nonexistent.txt');
      expect(exists).toBe(false);
    });
  });


  describe('deleteBlob', () => {
    it('should not throw error when blob does not exist', async () => {
      jest.spyOn(service, 'blobExists').mockResolvedValue(false);
      await expect(service.deleteBlob('nonexistent.txt')).resolves.not.toThrow();
    });
  });

  describe('deleteManyBlobs', () => {
    it('should call removeObjects to delete many blobs', async () => {
      jest.spyOn(service['minioClient'], 'removeObjects').mockResolvedValue(undefined as any);
      await service.deleteManyBlobs(['blob1.txt', 'blob2.txt']);
      expect(service['minioClient'].removeObjects).toHaveBeenCalledTimes(1);
    });
  });
});

