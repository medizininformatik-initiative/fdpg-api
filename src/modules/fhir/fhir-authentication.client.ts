import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpanKind, SpanStatusCode, context, trace } from '@opentelemetry/api';
import axios, { AxiosInstance } from 'axios';
import { ITokenResult } from '../../shared/types/token-result.interface';

@Injectable()
export class FhirAuthenticationClient {
  constructor(private configService: ConfigService) {
    this.configureService();
    this.configureClient();
    this.obtainToken();
  }

  public client: AxiosInstance;
  private keycloakHost: string;
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string;

  private configureService() {
    this.keycloakHost = this.configService.get('FEASIBILITY_KEYCLOAK_HOST') || this.configService.get('KEYCLOAK_HOST');
    const keycloakRealm = this.configService.get('KEYCLOAK_REALM');
    this.clientId = this.configService.get('KEYCLOAK_CLIENT_FOR_FHIR_ID');
    this.clientSecret = this.configService.get('KEYCLOAK_CLIENT_FOR_FHIR_SECRET');
    this.tokenEndpoint = `${this.keycloakHost}/auth/realms/${keycloakRealm}/protocol/openid-connect/token`;
  }

  private configureClient() {
    this.client = axios.create();
  }

  async obtainToken(): Promise<ITokenResult | undefined> {
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
      trace.deleteSpan(context.active());

      return tokenResult.data;
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
      console.error(JSON.stringify({ e, error }));
    }

    return;
  }
}
