import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { plainToInstance } from 'class-transformer';
import { FeasibilityUserQueryDetailDto } from './dto/feasibility-user-query-detail.dto';
import { FeasibilityClient } from './feasibility.client';
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
          return Buffer.from(response.data);
        } else {
          return response.data;
        }
      } else {
        return { error: 'No content for feasibility query' };
      }
    } catch (error) {
      return { error: 'Failed to fetch the feasibility', message: JSON.stringify(error) };
    }
  }
}
