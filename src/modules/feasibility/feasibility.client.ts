import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpanKind, SpanStatusCode, context, trace } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ITokenResult } from '../../shared/types/token-result.interface';

@Injectable()
export class FeasibilityClient {
  constructor(private configService: ConfigService) {
    this.configureService();
    this.configureClient();
    this.obtainToken();
    this.configureInterceptors();
  }

  public client: AxiosInstance;
  private keycloakHost: string;
  private feasibilityBaseUrl: string;
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string;
  private currentAccessToken: string;

  private configureService() {
    this.keycloakHost = this.configService.get('FEASIBILITY_KEYCLOAK_HOST') || this.configService.get('KEYCLOAK_HOST');
    const feasibilityHost = this.configService.get('FEASIBILITY_HOST');
    const keycloakRealm = this.configService.get('KEYCLOAK_REALM');
    this.clientId = this.configService.get('KEYCLOAK_CLIENT_FOR_FEASIBILITY_ID');
    this.clientSecret = this.configService.get('KEYCLOAK_CLIENT_FOR_FEASIBILITY_SECRET');
    this.tokenEndpoint = `${this.keycloakHost}/auth/realms/${keycloakRealm}/protocol/openid-connect/token`;

    this.feasibilityBaseUrl = feasibilityHost;
  }

  private configureClient() {
    this.client = axios.create({
      baseURL: this.feasibilityBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async obtainToken() {
    const tracer = trace.getTracer('basic');
    const span = tracer.startSpan('Feasibility Client - Obtain Token', {
      kind: SpanKind.CLIENT,
      root: true,
      attributes: {
        ['http.method']: 'POST',
        ['http.host']: this.keycloakHost,
        ['http.target']: this.tokenEndpoint,
        ['http.url']: this.tokenEndpoint,
        ['feasibilityClient.keycloakClientId']: this.clientId,
        ['feasibilityClient.keycloakClientSecret']:
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
