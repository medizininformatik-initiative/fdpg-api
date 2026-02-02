import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { FhirAuthenticationClient } from './fhir-authentication.client';
import { applyAxiosMonitoring } from 'src/monitoring/apply-axios-monitoring';
import { KeycloakServiceAccountService } from 'src/shared/utils/keycloak-service-account.service';

@Injectable()
export class FhirClient {
  constructor(
    private configService: ConfigService,
    private fhirAuthenticationClient: FhirAuthenticationClient,
    private keycloakServiceAccountService: KeycloakServiceAccountService,
  ) {
    this.configureService();
    this.configureClient();
    this.obtainToken();
    this.configureInterceptors();
  }

  private readonly logger = new Logger(FhirClient.name);

  public client: AxiosInstance;
  private fhirBaseUrl: string;
  private currentAccessToken: string;
  private serviceAccountEmail: string;
  private isFirstTokenFetch = true;

  public readonly FHIR_JSON_HEADERS = {
    Accept: 'application/fhir+json',
    'Content-Type': 'application/fhir+json',
  };

  public readonly FHIR_XML_HEADERS = {
    Accept: 'application/fhir+xml',
    'Content-Type': 'application/fhir+xml',
  };

  private configureService() {
    const fhirHost = this.configService.get('FHIR_HOST');

    this.fhirBaseUrl = fhirHost;
  }

  private configureClient() {
    this.client = axios.create({
      baseURL: this.fhirBaseUrl,
      timeout: 5 * 60 * 1_000,
      headers: {
        ...this.FHIR_JSON_HEADERS,
      },
    });

    applyAxiosMonitoring(this.client);
  }

  private async obtainToken() {
    const tokenResult = await this.fhirAuthenticationClient.obtainToken();
    this.currentAccessToken = tokenResult?.access_token;
    const expiresIn = tokenResult?.expires_in ?? 120;

    // Fetch service account email only on first token fetch
    if (this.isFirstTokenFetch && this.currentAccessToken) {
      this.setServiceAccountEmail();
      this.isFirstTokenFetch = false;
    }

    setTimeout(this.obtainToken.bind(this), (expiresIn / 2) * 1_000);
  }

  private setServiceAccountEmail() {
    this.serviceAccountEmail = this.keycloakServiceAccountService.getServiceAccountEmail(this.currentAccessToken);
  }

  public getServiceAccountEmail(): string {
    if (!this.serviceAccountEmail) {
      throw new Error('Service account email not set yet.');
    }

    return this.serviceAccountEmail;
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
