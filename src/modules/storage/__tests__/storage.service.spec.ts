import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage.service';
import * as minio from 'minio';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { SupportedMimetype } from 'src/modules/proposal/enums/supported-mime-type.enum';
import { getError } from 'test/get-error';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { NotFoundException } from '@nestjs/common';

describe('StorageService', () => {
  const blobName = 'blobName';
  let storageService: StorageService;

  const clientMock = {
    putObject: jest.fn(),
    statObject: jest.fn(),
    removeObject: jest.fn(),
    removeObjects: jest.fn(),
    presignedGetObject: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue('MOCK'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(minio, 'Client').mockReturnValue(clientMock as unknown as minio.Client);
    storageService = new StorageService(configService as unknown as ConfigService);
  });

  it('should be defined and setup', () => {
    expect(storageService).toBeDefined();
  });

  describe('uploadFile', () => {
    const user = {
      userId: 'userId',
      miiLocation: MiiLocation.Charité,
    } as unknown as IRequestUser;

    const file = {
      mimetype: SupportedMimetype.Pdf,
      originalname: 'originalname',
      buffer: 'bufferMock',
      size: 123,
    } as unknown as Express.Multer.File;

    it('should throw for invalid mimetypes', async () => {
      const fileMock = {
        ...file,
        mimetype: 'nope',
      };
      const call = storageService.uploadFile(blobName, fileMock, user);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(ValidationException);
    });

    it('should call the containerClient to upload the blob', async () => {
      await storageService.uploadFile(blobName, file, user);
      expect(clientMock.putObject).toHaveBeenCalledTimes(1);
    });

    it('should throw if the containerClient fails', async () => {
      clientMock.putObject.mockRejectedValueOnce('errror');
      const call = storageService.uploadFile(blobName, file, user);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('getSasUrl', () => {
    it('should throw if the blob does not exist', async () => {
      clientMock.statObject.mockRejectedValueOnce('doesnotexist');

      const call = storageService.getSasUrl(blobName);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('should generate presigned download URL', async () => {
      const resultUrl = 'resultUrl';
      clientMock.statObject.mockResolvedValueOnce('exists');
      clientMock.presignedGetObject.mockResolvedValueOnce(resultUrl);
      const result = await storageService.getSasUrl(blobName);
      expect(result).toEqual(resultUrl);
    });
  });

  describe('deleteBlob', () => {
    it('should call the blobClient to delete the blob', async () => {
      await storageService.deleteBlob(blobName);
      expect(clientMock.removeObject).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteManyBlobs', () => {
    it('should call the blobBatchClient to delete many blobs', async () => {
      await storageService.deleteManyBlobs(['blobName1', 'blobName2']);
      expect(clientMock.removeObjects).toHaveBeenCalledTimes(1);
    });
  });
});
