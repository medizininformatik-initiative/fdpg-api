import { ConfigService } from '@nestjs/config';
import { AzureStorageService } from '../azure-storage.service';
import * as azure from '@azure/storage-blob';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { SupportedMimetype } from 'src/modules/proposal/enums/supported-mime-type.enum';
import { getError } from 'test/get-error';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { NotFoundException } from '@nestjs/common';

jest.mock('@azure/storage-blob', () => ({
  StorageSharedKeyCredential: jest.fn(),
  BlobServiceClient: jest.fn(),
  ContainerClient: jest.fn(),
  ContainerSASPermissions: {
    parse: jest.fn(),
  },
}));

describe('AzureStorageService', () => {
  const blobName = 'blobName';
  let azureStorageService: AzureStorageService;
  const credential = 'credentialMock' as unknown as azure.StorageSharedKeyCredential;

  const createIfNotExistsMock = jest.fn();
  const uploadBlockBlobMock = jest.fn();
  const getBlockBlobClientMock = jest.fn();
  const getBlobBatchClientMock = jest.fn();
  const getContainerClientMock = jest.fn().mockReturnValue({
    createIfNotExists: createIfNotExistsMock,
    uploadBlockBlob: uploadBlockBlobMock,
    getBlockBlobClient: getBlockBlobClientMock,
    getBlobBatchClient: getBlobBatchClientMock,
  });

  const serviceClientMock = {
    getContainerClient: getContainerClientMock,
  };

  const configService = {
    get: jest.fn().mockReturnValue('MOCK'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(azure, 'StorageSharedKeyCredential').mockReturnValue(credential);
    jest.spyOn(azure, 'BlobServiceClient').mockReturnValue(serviceClientMock as unknown as azure.BlobServiceClient);
    azureStorageService = new AzureStorageService(configService as unknown as ConfigService);
  });

  it('should be defined and setup', () => {
    expect(azureStorageService).toBeDefined();
    expect(getContainerClientMock).toHaveBeenCalledWith('MOCK');
    expect(createIfNotExistsMock).toHaveBeenCalledTimes(1);
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
      const call = azureStorageService.uploadFile(blobName, fileMock, user);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(ValidationException);
    });

    it('should call the containerClient to upload the blob', async () => {
      await azureStorageService.uploadFile(blobName, file, user);
      expect(uploadBlockBlobMock).toBeCalledTimes(1);
    });

    it('should throw if the containerClient fails', async () => {
      uploadBlockBlobMock.mockRejectedValueOnce('errror');
      const call = azureStorageService.uploadFile(blobName, file, user);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('getSasUrl', () => {
    const existsMock = jest.fn();
    const generateSasUrlMock = jest.fn();

    beforeEach(() => {
      getBlockBlobClientMock.mockReturnValueOnce({
        exists: existsMock,
        generateSasUrl: generateSasUrlMock,
      });
    });

    it('should throw if the blob does not exist', async () => {
      existsMock.mockResolvedValueOnce(false);
      const call = azureStorageService.getSasUrl(blobName);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('should generate read permissions', async () => {
      const resultUrl = 'resultUrl';
      existsMock.mockResolvedValueOnce(true);
      generateSasUrlMock.mockResolvedValueOnce(resultUrl);
      const result = await azureStorageService.getSasUrl(blobName);

      expect(azure.ContainerSASPermissions.parse).toBeCalledWith('r');
      expect(result).toEqual(resultUrl);
    });
  });

  describe('getFileBuffer', () => {
    it('should return the buffer', async () => {
      const bufferMock = 'BufferMock';
      const downloadToBufferMock = jest.fn().mockResolvedValueOnce(bufferMock);
      getBlockBlobClientMock.mockReturnValueOnce({ downloadToBuffer: downloadToBufferMock });
      const result = await azureStorageService.getFileBuffer(blobName);
      expect(result).toEqual(bufferMock);
    });
  });
  describe('deleteBlob', () => {
    it('should call the blobClient to delete the blob', async () => {
      const deleteIfExistsMock = jest.fn();
      getBlockBlobClientMock.mockReturnValueOnce({ deleteIfExists: deleteIfExistsMock });
      await azureStorageService.deleteBlob(blobName);
    });
  });
  describe('deleteManyBlobs', () => {
    it('should call the blobBatchClient to delete many blobs', async () => {
      const deleteBlobsMock = jest.fn();
      getBlobBatchClientMock.mockReturnValueOnce({ deleteBlobs: deleteBlobsMock });

      await azureStorageService.deleteManyBlobs(['blobName1', 'blobName2']);
      expect(deleteBlobsMock).toBeCalledTimes(1)
    });
  });

  describe('unDeleteBlob', () => {
    it('should call the blobClient to undelete the blob', async () => {
      const undeleteMock = jest.fn();
      getBlockBlobClientMock.mockReturnValueOnce({ undelete: undeleteMock });
      await azureStorageService.unDeleteBlob(blobName);
    });
  });
});
