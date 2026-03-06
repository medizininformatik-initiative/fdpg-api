import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { applyAxiosMonitoring } from 'src/monitoring/apply-axios-monitoring';

export interface MiiLocationInfo {
  code: string;
  display: string;
  id?: string;
}

@Injectable()
export class MiiCodesystemClient {
  public client: AxiosInstance;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.configureService();
    this.configureClient();
  }

  private configureService() {
    this.baseUrl = this.configService.get<string>('MII_CODESYSTEM_URL');
  }

  private configureClient() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: { Accept: 'application/json', 'User-Agent': 'FDPG-API/1.0' },
    });

    applyAxiosMonitoring(this.client);
  }
}
