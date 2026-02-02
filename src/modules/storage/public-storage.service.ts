import { Client, ItemBucketMetadata } from 'minio';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PublicStorageService {
  private readonly logger = new Logger(PublicStorageService.name);
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
      try {
        this.minioClient = new Client({
          endPoint: this.endPoint,
          port: this.port,
          useSSL: this.useSSL,
          accessKey,
          secretKey,
        });

        this.logger.log(`PublicStorageService configured successfully - bucket: ${this.bucketName}`);
        this.logger.log(
          `Full URL pattern: ${this.useSSL ? 'https' : 'http'}://${this.endPoint}:${this.port}/${this.bucketName}`,
        );
      } catch (error) {
        this.logger.error('Failed to create Minio client:', error);
        throw error;
      }
    } else {
      const missingVars = [];
      if (!this.endPoint) missingVars.push('S3_PUBLIC_ENDPOINT');
      if (!this.bucketName) missingVars.push('S3_PUBLIC_BUCKET_NAME');
      if (!accessKey) missingVars.push('S3_PUBLIC_ACCESSKEY');
      if (!secretKey) missingVars.push('S3_PUBLIC_SECRETKEY');

      this.logger.warn(`PublicStorageService is not configured. Missing variables: ${missingVars.join(', ')}`);
    }
  }

  async uploadFile(blobName: string, file: Express.Multer.File): Promise<void> {
    if (!this.isConfigured || !this.minioClient) {
      const error = 'PublicStorageService is not configured. Set S3_PUBLIC_* environment variables.';
      this.logger.error(error);
      throw new Error(error);
    }

    this.logger.log(`Attempting to upload file: ${blobName} (${file.size} bytes, ${file.mimetype})`);

    const metadata: ItemBucketMetadata = {
      'Content-Type': file.mimetype,
    };

    try {
      await this.minioClient.putObject(this.bucketName, blobName, file.buffer, file.size, metadata);
      this.logger.log(`Successfully uploaded file: ${blobName}`);
    } catch (error) {
      this.logger.error(`Failed to upload file to public bucket: ${blobName}`);
      this.logger.error(`Error details: ${error.message || error}`);
      this.logger.error(`Bucket: ${this.bucketName}, Endpoint: ${this.endPoint}:${this.port}`);
      this.logger.error(`Metadata: ${JSON.stringify(metadata)}`);
      throw error;
    }
  }

  getPublicUrl(blobName: string): string {
    if (!this.isConfigured) {
      const error = 'PublicStorageService is not configured. Set S3_PUBLIC_* environment variables.';
      this.logger.error(error);
      throw new Error(error);
    }

    const protocol = this.useSSL ? 'https' : 'http';
    const portPart = (this.useSSL && this.port === 443) || (!this.useSSL && this.port === 80) ? '' : `:${this.port}`;

    // Use path-style URLs for IP addresses and localhost, virtual-hosted style for domain names
    const isIpOrLocalhost = /^(\d+\.\d+\.\d+\.\d+|localhost)$/.test(this.endPoint);

    let url: string;
    if (isIpOrLocalhost) {
      // Path-style: http://127.0.0.1:9000/bucket/object
      url = `${protocol}://${this.endPoint}${portPart}/${this.bucketName}/${blobName}`;
    } else {
      // Virtual-hosted style: http://bucket.domain.com/object
      url = `${protocol}://${this.bucketName}.${this.endPoint}${portPart}/${blobName}`;
    }

    this.logger.debug(`Generated public URL for ${blobName}: ${url}`);
    return url;
  }

  async blobExists(blobName: string): Promise<boolean> {
    if (!this.isConfigured || !this.minioClient) {
      this.logger.warn(`Cannot check blob existence - service not configured: ${blobName}`);
      return false;
    }

    try {
      await this.minioClient.statObject(this.bucketName, blobName);
      this.logger.debug(`Blob exists: ${blobName}`);
      return true;
    } catch (error) {
      this.logger.debug(`Blob does not exist or error checking: ${blobName} - ${error.message || error}`);
      return false;
    }
  }

  async getObject(blobName: string) {
    if (!this.isConfigured || !this.minioClient) {
      const error = 'PublicStorageService is not configured. Set S3_PUBLIC_* environment variables.';
      this.logger.error(error);
      throw new Error(error);
    }

    this.logger.log(`Retrieving object: ${blobName}`);
    try {
      const result = await this.minioClient.getObject(this.bucketName, blobName);
      this.logger.log(`Successfully retrieved object: ${blobName}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to retrieve object: ${blobName} - ${error.message || error}`);
      throw error;
    }
  }

  async deleteBlob(blobName: string): Promise<void> {
    if (!this.isConfigured || !this.minioClient) {
      this.logger.warn('Cannot delete blob - service not configured');
      return;
    }

    const exists = await this.blobExists(blobName);
    if (!exists) {
      this.logger.debug(`Blob does not exist, skipping deletion: ${blobName}`);
      return;
    }

    try {
      await this.minioClient.removeObject(this.bucketName, blobName);
      this.logger.log(`Successfully deleted blob: ${blobName}`);
    } catch (error) {
      this.logger.error(`Failed to delete blob: ${blobName} - ${error.message || error}`);
      throw error;
    }
  }

  async deleteManyBlobs(blobNames: string[]): Promise<void> {
    if (!this.isConfigured || !this.minioClient) {
      this.logger.warn('Cannot delete blobs - service not configured');
      return;
    }

    this.logger.log(`Attempting to delete ${blobNames.length} blobs`);
    try {
      await this.minioClient.removeObjects(this.bucketName, blobNames);
      this.logger.log(`Successfully deleted ${blobNames.length} blobs`);
    } catch (error) {
      this.logger.error(`Failed to delete blobs - ${error.message || error}`);
      this.logger.error(`Blob names: ${blobNames.join(', ')}`);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }
}
