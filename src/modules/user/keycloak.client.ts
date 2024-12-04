import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpanKind, SpanStatusCode, context, trace } from '@opentelemetry/api';
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ITokenResult } from '../../shared/types/token-result.interface';
@Injectable()
export class KeycloakClient {
  constructor(private configService: ConfigService) {
    this.configureService();
    this.configureClient();
    this.obtainToken();
    this.configureInterceptors();
  }
  public client: AxiosInstance;
  private host: string;
  private adminBaseUrl: string;
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string;
  private currentAccessToken: string;

  private configureService() {
    const realm = this.configService.get('KEYCLOAK_REALM');
    this.host = this.configService.get('KEYCLOAK_HOST');
    this.clientId = this.configService.get('KEYCLOAK_CLIENT_ID');
    this.clientSecret = this.configService.get('KEYCLOAK_CLIENT_SECRET');
    this.tokenEndpoint = `${this.host}/auth/realms/${realm}/protocol/openid-connect/token`;

    this.adminBaseUrl = `${this.host}/auth/admin/realms/${realm}`;
  }

  private configureClient() {
    this.client = axios.create({
      baseURL: this.adminBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async obtainToken() {
    const tracer = trace.getTracer('basic');
    const span = tracer.startSpan('Keycloak Client - Obtain Token', {
      kind: SpanKind.CLIENT,
      root: true,
      attributes: {
        ['http.method']: 'POST',
        ['http.host']: this.host,
        ['http.target']: this.tokenEndpoint,
        ['http.url']: this.tokenEndpoint,
        ['keycloakClient.keycloakClientId']: this.clientId,
        ['keycloakClient.keycloakClientSecret']:
          '*******' + this.clientSecret.slice(this.clientSecret.length - 2, this.clientSecret.length),
      },
    });

    let tokenResult: AxiosResponse<ITokenResult, any>;
    try {
      const tokenResult = await this.client.post<ITokenResult>(
        this.tokenEndpoint,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-no-trace': true } },
      );
      this.currentAccessToken = tokenResult.data.access_token;
      trace.deleteSpan(context.active());
    } catch (error) {
      const e = new Error(error.response?.data?.error_description ?? 'Failed to obtain a keycloak access_token');
      e.name = error.response?.statusText ?? 'Token Error';
      span.recordException({
        code: error.response?.status ?? 500,
        name: e.name,
        message: JSON.stringify(error.response?.data),
        stack: e.stack,
      });
      span.setStatus({ code: SpanStatusCode.ERROR, message: e.name });
      span.end();
    }

    // Get new token at the half of the lifetime of the token or retry after a minute
    setTimeout(this.obtainToken.bind(this), (tokenResult ? tokenResult.data.expires_in : 120 / 2) * 1_000);
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
