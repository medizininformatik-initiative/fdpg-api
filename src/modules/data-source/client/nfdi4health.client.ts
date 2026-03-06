import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { applyAxiosMonitoring } from 'src/monitoring/apply-axios-monitoring';

@Injectable()
export class Nfdi4HealthClient {
  constructor(private configService: ConfigService) {
    this.configureService();
    this.configureClient();
  }

  private readonly logger = new Logger(Nfdi4HealthClient.name);

  public client: AxiosInstance;
  private baseUrl: string;

  private configureService() {
    const host = this.configService.get('NFDI4HEALTH_HOST');

    this.baseUrl = host;
  }

  private configureClient() {
    const environment = this.configService.get('ENV') || 'DEV';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5 * 60 * 1_000,
      headers: {
        'User-Agent': `FDPG-API-${environment}`,
      },
    });

    applyAxiosMonitoring(this.client);
  }
}
