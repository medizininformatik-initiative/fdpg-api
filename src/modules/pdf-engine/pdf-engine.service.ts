import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ProposalGetDto } from '../proposal/dto/proposal/proposal.dto';
import { PdfEngineClient } from './pdf-engine.client';
import { DataPrivacyTextsContentKeys } from '../admin/dto/data-privacy/data-privacy-texts.dto';
@Injectable()
export class PdfEngineService {
  constructor(private pdfEngineClient: PdfEngineClient) {
    this.apiClient = this.pdfEngineClient.client;
  }
  private readonly basePath = 'api';
  private apiClient: AxiosInstance;

  async createProposalPdf(proposal: ProposalGetDto, dataPrivacyTexts: DataPrivacyTextsContentKeys[]): Promise<Buffer> {
    try {
      const response = await this.apiClient.post<{ data: Uint8Array }>(`${this.basePath}/proposal/buffer`, {
        data: proposal,
        dataPrivacyTexts,
      });

      const buffer = Buffer.from(response.data.data);
      return buffer;
    } catch (error) {
      console.log(error);
      const isAxiosError = axios.isAxiosError(error);
      const gatewayError = {
        message: 'Failed to generate pdf from external service',
        externalStatus: undefined,
      };

      if (isAxiosError) {
        gatewayError.externalStatus = error.response?.status;
      }

      throw new BadGatewayException(gatewayError);
    }
  }
}
