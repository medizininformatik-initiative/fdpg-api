import { Client, ItemBucketMetadata } from 'minio';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PublicStorageService {
  private readonly minioClient: Client | null = null;
  private readonly bucketName: string;
  private readonly endPoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.endPoint = this.configService.get('S3_PUBLIC_ENDPOINT');
    this.port = parseInt(this.configService.get('S3_PUBLIC_PORT') || '443');
    this.useSSL = (this.configService.get('S3_PUBLIC_USE_SSL') || '').toLowerCase() === 'true';
    this.bucketName = this.configService.get('S3_PUBLIC_BUCKET_NAME');

    const accessKey = this.configService.get('S3_PUBLIC_ACCESSKEY');
    const secretKey = this.configService.get('S3_PUBLIC_SECRETKEY');

    this.isConfigured = !!(this.endPoint && this.bucketName && accessKey && secretKey);

    if (this.isConfigured) {
      this.minioClient = new Client({
        endPoint: this.endPoint,
        port: this.port,
        useSSL: this.useSSL,
        accessKey,
        secretKey,
      });
    }
  }

  async uploadFile(blobName: string, file: Express.Multer.File): Promise<void> {
    if (!this.isConfigured || !this.minioClient) {
      throw new Error('PublicStorageService is not configured. Set S3_PUBLIC_* environment variables.');
    }

    const metadata: ItemBucketMetadata = {
      'Content-Type': file.mimetype,
    };

    try {
      await this.minioClient.putObject(this.bucketName, blobName, file.buffer, file.size, metadata);
    } catch (error) {
      console.log('Failed to upload file to public bucket: ', error);
      console.log('Failed blob options: ', metadata);
      throw new Error();
    }
  }

  getPublicUrl(blobName: string): string {
    if (!this.isConfigured) {
      throw new Error('PublicStorageService is not configured. Set S3_PUBLIC_* environment variables.');
    }

    const protocol = this.useSSL ? 'https' : 'http';
    const portPart = (this.useSSL && this.port === 443) || (!this.useSSL && this.port === 80) ? '' : `:${this.port}`;
    return `${protocol}://${this.bucketName}.${this.endPoint}${portPart}/${blobName}`;
  }

  async blobExists(blobName: string): Promise<boolean> {
    if (!this.isConfigured || !this.minioClient) {
      return false;
    }

    try {
      await this.minioClient.statObject(this.bucketName, blobName);
      return true;
    } catch {
      return false;
    }
  }

  async getObject(blobName: string) {
    if (!this.isConfigured || !this.minioClient) {
      throw new Error('PublicStorageService is not configured. Set S3_PUBLIC_* environment variables.');
    }
    return await this.minioClient.getObject(this.bucketName, blobName);
  }

  async deleteBlob(blobName: string): Promise<void> {
    if (!this.isConfigured || !this.minioClient) {
      return;
    }

    const exists = await this.blobExists(blobName);
    if (!exists) {
      return;
    }
    await this.minioClient.removeObject(this.bucketName, blobName);
  }

  async deleteManyBlobs(blobNames: string[]): Promise<void> {
    if (!this.isConfigured || !this.minioClient) {
      return;
    }
    await this.minioClient.removeObjects(this.bucketName, blobNames);
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }
}
