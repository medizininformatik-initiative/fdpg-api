import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKey } from 'src/shared/enums/cache-key.enum';
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
  private readonly CACHE_DURATION_MS = 0.3 * 60 * 60 * 1000; // 30 minutes

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
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
    const cachedData = await this.cacheManager.get<Map<string, MiiLocationInfo>>(CacheKey.MiiLocations);

    if (cachedData && cachedData.has(locationCode)) {
      return cachedData.get(locationCode);
    }

    if (!cachedData) {
      await this.fetchAndCacheLocationData();
      const refreshedData = await this.cacheManager.get<Map<string, MiiLocationInfo>>(CacheKey.MiiLocations);
      return refreshedData?.get(locationCode) || null;
    }

    return null;
  }

  async getAllLocationInfo(): Promise<Map<string, MiiLocationInfo>> {
    const cachedData = await this.cacheManager.get<Map<string, MiiLocationInfo>>(CacheKey.MiiLocations);

    if (!cachedData) {
      await this.fetchAndCacheLocationData();
      const refreshedData = await this.cacheManager.get<Map<string, MiiLocationInfo>>(CacheKey.MiiLocations);
      return refreshedData || new Map();
    }

    return cachedData;
  }

  private async fetchAndCacheLocationData(): Promise<void> {
    try {
      const url = this.getMiiCodeSystemUrl();
      this.logger.log(`Fetching MII location data from: ${url}`);

      const response = await this.httpClient.get(url);

      if (response.data && response.data.concept) {
        const locationCache = new Map<string, MiiLocationInfo>();

        response.data.concept.forEach((concept: any) => {
          if (concept.code && concept.display) {
            locationCache.set(concept.code, {
              code: concept.code,
              display: concept.display,
            });
          }
        });

        await this.cacheManager.set(CacheKey.MiiLocations, locationCache, this.CACHE_DURATION_MS);
        this.logger.log(`Successfully cached ${locationCache.size} MII locations`);
      } else {
        this.logger.warn('Invalid response structure from MII CodeSystem');
      }
    } catch (error) {
      this.logger.error('Failed to fetch MII location data:', error.message);
    }
  }

  async refreshCache(): Promise<void> {
    await this.cacheManager.del(CacheKey.MiiLocations);
    await this.fetchAndCacheLocationData();
  }
}
