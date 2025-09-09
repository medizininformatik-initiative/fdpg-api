import { Client, ItemBucketMetadata } from 'minio';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { validateMimetype } from 'src/shared/utils/validate-mimetype.util';
import { SupportedMimetype } from '../proposal/enums/supported-mime-type.enum';

@Injectable()
export class StorageService {
  private readonly minioClient: Client;
  private readonly bucketName: string;
  private readonly supportedMimetypes = Object.values(SupportedMimetype);

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get('S3_ENDPOINT');
    const port = parseInt(this.configService.get('S3_PORT') || '443');
    const useSSL = (this.configService.get('S3_USE_SSL') || '').toLowerCase() === 'true';
    const accessKey = this.configService.get('S3_ACCESSKEY');
    const secretKey = this.configService.get('S3_SECRETKEY');

    this.minioClient = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.bucketName = this.configService.get('S3_BUCKET');
  }

  async uploadFile(blobName: string, file: Express.Multer.File, user: IRequestUser): Promise<void> {
    validateMimetype(file, this.supportedMimetypes);

    const encodedFileName = encodeURIComponent(file.originalname);
    const filenameRemovedNonAscii = file.originalname.replace(/[^\x00-\x7F]/g, '');
    const userLocationRemovedNonAscii = user.miiLocation ? user.miiLocation.replace(/[^\x00-\x7F]/g, '_') : null;

    const metadata: ItemBucketMetadata = {
      'Content-Type': file.mimetype,
      'Content-Disposition': `attachment; filename="${filenameRemovedNonAscii}"; filename*=UTF-8''${encodedFileName}`,
      userLocation: userLocationRemovedNonAscii,
      userId: user.userId,
    };

    try {
      await this.minioClient.putObject(this.bucketName, blobName, file.buffer, file.size, metadata);
    } catch (error) {
      console.log('Failed to upload Blob: ', error);
      console.log('Failed blob options: ', metadata);
      throw new Error();
    }
  }

  async getSasUrl(blobName: string, longLife: boolean = false): Promise<string> {
    const lifetimeInSeconds = longLife ? 60 * 60 * 24 * 7 : 20; // 7 days or 20 seconds

    const exists = await this.blobExists(blobName);
    if (!exists) {
      throw new NotFoundException('Upload does not exist');
    }

    return await this.minioClient.presignedGetObject(this.bucketName, blobName, lifetimeInSeconds);
  }

  async blobExists(blobName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, blobName);
      return true;
    } catch {
      return false;
    }
  }

  async getObject(blobName: string) {
    return await this.minioClient.getObject(this.bucketName, blobName);
  }

  async deleteBlob(blobName: string): Promise<void> {
    const exists = await this.blobExists(blobName);
    if (!exists) {
      return;
    }
    await this.minioClient.removeObject(this.bucketName, blobName);
  }

  async deleteManyBlobs(blobNames: string[]): Promise<void> {
    await this.minioClient.removeObjects(this.bucketName, blobNames);
  }
}
