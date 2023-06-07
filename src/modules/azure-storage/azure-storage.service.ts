import * as azure from '@azure/storage-blob';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { validateMimetype } from 'src/shared/utils/validate-mimetype.util';
import { SupportedMimetype } from '../proposal/enums/supported-mime-type.enum';

@Injectable()
export class AzureStorageService {
  private credential: azure.StorageSharedKeyCredential;
  private serviceClient: azure.BlobServiceClient;
  private containerClient: azure.ContainerClient;
  private readonly supportedMimetypes = Object.values(SupportedMimetype);

  constructor(private readonly configService: ConfigService) {
    const containerName = this.configService.get('STORAGE_CONTAINER_NAME');
    const accountName = this.configService.get('STORAGE_ACCOUNT_NAME');
    const accountKey = this.configService.get('STORAGE_ACCOUNT_KEY');
    const accountUrl = `https://${accountName}.blob.core.windows.net/`;

    this.credential = new azure.StorageSharedKeyCredential(accountName, accountKey);
    this.serviceClient = new azure.BlobServiceClient(accountUrl, this.credential);
    this.containerClient = this.serviceClient.getContainerClient(containerName);

    this.containerClient.createIfNotExists();
  }

  async uploadFile(blobName: string, file: Express.Multer.File, user: IRequestUser): Promise<void> {
    validateMimetype(file, this.supportedMimetypes);

    const encodedFileName = encodeURIComponent(file.originalname);
    const filenameRemovedNonAscii = file.originalname.replace(/[^\x00-\x7F]/g, '');
    const userLocationRemovedNonAscii = user.miiLocation ? user.miiLocation.replace(/[^\x00-\x7F]/g, '_') : null;
    const options: azure.BlockBlobUploadOptions = {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
        blobContentDisposition: `attachment; filename="${filenameRemovedNonAscii}"; filename*=UTF-8''${encodedFileName}`,
      },
      tags: {
        userLocation: userLocationRemovedNonAscii,
        userId: user.userId,
      },
    };
    try {
      await this.containerClient.uploadBlockBlob(blobName, file.buffer, file.size, options);
    } catch (error) {
      console.log('Failed to upload Blob: ', error);
      console.log('Failed blob options: ', options);
      throw new Error();
    }
  }

  async getSasUrl(blobName: string, longLife: boolean = false): Promise<string> {
    const lifetimeInSeconds = longLife ? 60 * 60 * 24 * 7 : 20; // 7 days or 20 seconds
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    const now = new Date();
    const expiresOn = new Date(now.setSeconds(now.getSeconds() + lifetimeInSeconds));
    const exists = await blockBlobClient.exists();

    if (!exists) {
      throw new NotFoundException('Upload does not exist');
    }
    return await blockBlobClient.generateSasUrl({
      expiresOn,
      permissions: azure.ContainerSASPermissions.parse('r'),
    });
  }

  async getFileBuffer(blobName: string): Promise<Buffer> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.downloadToBuffer();
  }

  async deleteBlob(blobName: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  }

  async deleteManyBlobs(blobNames: string[]): Promise<void> {
    const blobClients = blobNames.map((blob) => this.containerClient.getBlockBlobClient(blob));
    const blobBatchClient = this.containerClient.getBlobBatchClient();
    await blobBatchClient.deleteBlobs(blobClients);
  }

  async unDeleteBlob(blobName: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.undelete();
  }
}
