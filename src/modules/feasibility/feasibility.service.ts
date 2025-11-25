import { BadGatewayException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { plainToInstance } from 'class-transformer';
import { FeasibilityUserQueryDetailDto } from './dto/feasibility-user-query-detail.dto';
import { FeasibilityClient } from './feasibility.client';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import * as yauzl from 'yauzl';
import { IFeasibilityUserQueryDetail } from './types/feasibility-user-query-detail.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeasibilityService {
  constructor(
    private feasibilityClient: FeasibilityClient,
    private configService: ConfigService,
  ) {
    this.apiClient = this.feasibilityClient.client;

    this.QUERY_LIEFTIME_MINUTES = this.configService.get('FEASIBILITY_QUERY_LIEFTIME_MINUTES', 5) * 1;
  }
  private readonly basePath = 'api/v5/query/data';
  private apiClient: AxiosInstance;

  private QUERY_LIEFTIME_MINUTES: number;

  async getQueriesByUser(userId: string): Promise<FeasibilityUserQueryDetailDto[]> {
    try {
      const response = await this.apiClient.get<IFeasibilityUserQueryDetail[]>(`${this.basePath}/by-user/${userId}`);
      return response.data.map((detail) => plainToInstance(FeasibilityUserQueryDetailDto, detail));
    } catch (error) {
      console.log(error);
      const isAxiosError = axios.isAxiosError(error);
      const gatewayError = {
        message: 'Failed to fetch feasibility queries by user from external service',
        externalStatus: undefined,
      };

      if (isAxiosError) {
        gatewayError.externalStatus = error.response?.status;
      }

      throw new BadGatewayException(gatewayError);
    }
  }

  async getQueryById(queryId: number): Promise<any> {
    const response = await this.apiClient.get(`${this.basePath}/${queryId}`);
    return response.data;
  }

  private async isValidZip(buffer) {
    return new Promise((resolve) => {
      yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) return resolve(false);

        let isCorrupted = false;

        zipfile.readEntry();
        zipfile.on('entry', () => {
          zipfile.readEntry();
        });
        zipfile.on('error', () => {
          isCorrupted = true;
          resolve(false);
        });
        zipfile.on('end', () => {
          if (!isCorrupted) resolve(true);
        });
      });
    });
  }

  async getQueryContentById(queryId: number, fileType: 'JSON' | 'ZIP' = 'JSON'): Promise<any> {
    try {
      const headerFileType = (() => {
        switch (fileType) {
          case 'JSON':
            return 'application/json';
          case 'ZIP':
            return 'application/zip';
        }
      })();

      const response = await this.apiClient.get(`${this.basePath}/${queryId}/crtdl`, {
        headers: {
          Accept: headerFileType,
        },
        responseType: fileType === 'ZIP' ? 'arraybuffer' : 'json',
      });

      if (response.data !== '' && response.data !== undefined) {
        if (fileType === 'ZIP') {
          const bufferData = Buffer.from(response.data);
          const isValid = await this.isValidZip(bufferData);

          if (isValid) {
            return bufferData;
          }

          const errorInfo = new ValidationErrorInfo({
            constraint: 'feasibilityError',
            message: 'ZIP file is not valid',
            property: 'feasibility',
            code: BadRequestError.FeasibilityError,
          });
          throw new ValidationException([errorInfo]);
        } else {
          return response.data;
        }
      } else {
        return { error: 'No content for feasibility query' };
      }
    } catch (error) {
      console.error('Failed to fetch the feasibility', error);
      const errorInfo = new ValidationErrorInfo({
        constraint: 'feasibilityError',
        message: 'Something went wrong calling the feasibility API',
        property: 'feasibility',
        code: BadRequestError.FeasibilityError,
      });
      throw new ValidationException([errorInfo]);
    }
  }

  async getRedirectUrl(queryId: number, userId: string): Promise<{ redirectUrl: string }> {
    const ttl = this.minutesToISO8601Duration(this.QUERY_LIEFTIME_MINUTES);

    try {
      const query = await this.getQueryById(queryId);
      const response = await this.apiClient.post(`${this.basePath}/by-user/${userId}`, query, {
        params: {
          ttl,
        },
      });

      const backendLocation = '' + response.headers['location'];
      const redirectUrl = backendLocation.replace(this.basePath + '/', '/data-query/load-query?id=');

      return { redirectUrl };
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 403) {
          console.error(`Forbidden access to API for user ${userId}. Details:`, error.response?.data);
          throw new ForbiddenException('Access to the external resource is forbidden.');
        } else if (status) {
          console.error(`API returned status ${status} for user ${userId}.`, error.response?.data);
          throw new InternalServerErrorException(`External API request failed with status: ${status}`);
        } else {
          console.error(`Network or connection error during API call for user ${userId}.`, error.message);
          throw new InternalServerErrorException('External API is unreachable or timed out.');
        }
      }

      // If it's not an Axios error, re-throw the original error
      throw error;
    }
  }

  private minutesToISO8601Duration(totalMinutes: number) {
    // Guard against invalid or negative input
    if (typeof totalMinutes !== 'number' || totalMinutes < 0 || !isFinite(totalMinutes)) {
      return 'Invalid Input';
    }

    // Constants
    const MINUTES_IN_DAY = 24 * 60;
    const MINUTES_IN_HOUR = 60;

    // 1. Calculate Days (D)
    const days = Math.floor(totalMinutes / MINUTES_IN_DAY);
    let remainingMinutes = totalMinutes % MINUTES_IN_DAY;

    // 2. Calculate Hours (H)
    const hours = Math.floor(remainingMinutes / MINUTES_IN_HOUR);

    // 3. Calculate Minutes (M)
    const minutes = remainingMinutes % MINUTES_IN_HOUR;

    // 4. Construct the ISO 8601 string

    let duration = 'P';

    // Append Date components
    if (days > 0) {
      duration += days + 'D';
    }

    // Check if any Time components exist
    const hasTime = hours > 0 || minutes > 0;
    if (hasTime) {
      duration += 'T';

      if (hours > 0) {
        duration += hours + 'H';
      }

      if (minutes > 0) {
        duration += minutes + 'M';
      }
    }

    // Edge case: If the duration is exactly zero, return PT0M (or P0D, but time is preferred for minutes input)
    if (duration === 'P') {
      return 'PT0M';
    }

    return duration;
  }
}
