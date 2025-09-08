import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface MiiLocationInfo {
  code: string;
  display: string;
  id?: string;
}

@Injectable()
export class MiiLocationService {
  private readonly logger = new Logger(MiiLocationService.name);
  private readonly httpClient: AxiosInstance;
  private locationCache: Map<string, MiiLocationInfo> = new Map();
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FDPG-API/1.0',
      },
    });
  }

  private getMiiCodeSystemUrl(): string {
    return this.configService.get<string>(
      'MII_CODESYSTEM_URL',
      'https://fhir.simplifier.net/R4/CodeSystem/84198ff6-2c92-426f-96f2-bacd648543bb',
    );
  }

  async getLocationInfo(locationCode: string): Promise<MiiLocationInfo | null> {
    if (this.isCacheValid() && this.locationCache.has(locationCode)) {
      return this.locationCache.get(locationCode);
    }

    if (!this.isCacheValid()) {
      await this.fetchAndCacheLocationData();
    }

    return this.locationCache.get(locationCode) || null;
  }

  async getAllLocationInfo(): Promise<Map<string, MiiLocationInfo>> {
    if (!this.isCacheValid()) {
      await this.fetchAndCacheLocationData();
    }
    return new Map(this.locationCache);
  }

  private async fetchAndCacheLocationData(): Promise<void> {
    try {
      const url = this.getMiiCodeSystemUrl();
      this.logger.log(`Fetching MII location data from: ${url}`);

      const response = await this.httpClient.get(url);

      if (response.data && response.data.concept) {
        this.locationCache.clear();

        response.data.concept.forEach((concept: any) => {
          if (concept.code && concept.display) {
            this.locationCache.set(concept.code, {
              code: concept.code,
              display: concept.display,
            });
          }
        });

        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);
        this.logger.log(`Successfully cached ${this.locationCache.size} MII locations`);
      } else {
        this.logger.warn('Invalid response structure from MII CodeSystem');
      }
    } catch (error) {
      this.logger.error('Failed to fetch MII location data:', error.message);
    }
  }

  private isCacheValid(): boolean {
    return this.cacheExpiry !== null && this.cacheExpiry > new Date();
  }

  async refreshCache(): Promise<void> {
    this.cacheExpiry = null;
    await this.fetchAndCacheLocationData();
  }
}
