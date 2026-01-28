import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { plainToInstance } from 'class-transformer';
import { FeasibilityUserQueryDetailDto } from './dto/feasibility-user-query-detail.dto';
import { FeasibilityClient } from './feasibility.client';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import * as yauzl from 'yauzl';
import { IFeasibilityUserQueryDetail } from './types/feasibility-user-query-detail.interface';

@Injectable()
export class FeasibilityService {
  constructor(private feasibilityClient: FeasibilityClient) {
    this.apiClient = this.feasibilityClient.client;
  }
  private readonly basePath = 'api/v5/query/data';
  private apiClient: AxiosInstance;

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
}
