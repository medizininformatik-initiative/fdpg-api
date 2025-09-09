import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class ProposalDownloadService {
  constructor(private readonly storageService: StorageService) {}

  async downloadFile(blobName: string): Promise<Buffer> {
    const exists = await this.storageService.blobExists(blobName);
    if (!exists) {
      throw new NotFoundException(`Upload does not exist: ${blobName}`);
    }

    try {
      const dataStream = await this.storageService.getObject(blobName);

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        dataStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        dataStream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        dataStream.on('error', (error) => {
          reject(new Error(`Failed to stream file ${blobName}: ${error.message}`));
        });
      });
    } catch (error) {
      throw new NotFoundException(`Failed to download file ${blobName}: ${error.message}`);
    }
  }
}
