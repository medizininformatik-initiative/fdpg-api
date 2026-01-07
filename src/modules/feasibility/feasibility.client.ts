import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { FeasibilityAuthenticationClient } from './feasibility-authentication.client';
import { applyAxiosMonitoring } from 'src/monitoring/apply-axios-monitoring';

@Injectable()
export class FeasibilityClient {
  constructor(
    private configService: ConfigService,
    private feasibilityAuthenticationClient: FeasibilityAuthenticationClient,
  ) {
    this.configureService();
    this.configureClient();
    this.obtainToken();
    this.configureInterceptors();
  }

  public client: AxiosInstance;
  private feasibilityBaseUrl: string;
  private currentAccessToken: string;

  private configureService() {
    const feasibilityHost = this.configService.get('FEASIBILITY_HOST');

    this.feasibilityBaseUrl = feasibilityHost;
  }

  private configureClient() {
    this.client = axios.create({
      baseURL: this.feasibilityBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    applyAxiosMonitoring(this.client);
  }

  private async obtainToken() {
    const tokenResult = await this.feasibilityAuthenticationClient.obtainToken();
    this.currentAccessToken = tokenResult?.access_token;
    const expiresIn = tokenResult?.expires_in ?? 120;
    setTimeout(this.obtainToken.bind(this), (expiresIn / 2) * 1_000);
  }

  private configureInterceptors() {
    this.client.interceptors.request.use(this.requestInterceptor.onFullfilled, this.requestInterceptor.onRejected);
  }

  private requestInterceptor = {
    onFullfilled: (config: InternalAxiosRequestConfig<any>) => {
      if (this.currentAccessToken) {
        const authHeader = `Bearer ${this.currentAccessToken}`;
        config.headers.set('Authorization', authHeader);
      }

      return Promise.resolve(config);
    },

    onRejected: (error: AxiosError) => Promise.reject(error),
  };
}
