import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { plainToInstance } from 'class-transformer';
import { FeasibilityUserQueryDetailDto } from './dto/feasibility-user-query-detail.dto';
import { FeasibilityClient } from './feasibility.client';
import { IFeasibilityResultDetailedResponse } from './types/feasibility-result-detailed-response';
import { IFeasibilityUserQueryDetail } from './types/feasibility-user-query-detail.interface';

@Injectable()
export class FeasibilityService {
  constructor(private feasibilityClient: FeasibilityClient) {
    this.apiClient = this.feasibilityClient.client;
  }
  private readonly basePath = 'api/v4/query';
  private apiClient: AxiosInstance;

  async getQueriesByUser(userId: string): Promise<FeasibilityUserQueryDetailDto[]> {
    const params = {
      filter: 'saved',
    };

    try {
      const response = await this.apiClient.get<IFeasibilityUserQueryDetail[]>(`${this.basePath}/by-user/${userId}`, {
        params,
      });
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

  async getQueryContentById(queryId: number): Promise<any> {
    try {
      const response = await this.apiClient.get(`${this.basePath}/${queryId}/content`);

      if (response.data !== '' && response.data !== undefined) {
        return response.data;
      } else {
        return { error: 'No content for feasibility query' };
      }
    } catch (error) {
      return { error: 'Failed to fetch the feasibility', message: JSON.stringify(error) };
    }
  }

  async getQueryResultById(queryId: number): Promise<IFeasibilityResultDetailedResponse> {
    // detailed in the path could be removed to get anonym sites
    const response = await this.apiClient.get(`${this.basePath}/${queryId}/result/detailed`);
    return response.data;
  }
}
