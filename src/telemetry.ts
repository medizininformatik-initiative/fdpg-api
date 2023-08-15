import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { diag, DiagConsoleLogger, DiagLogLevel, SpanStatusCode } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { IncomingMessage } from 'http';
import { MongooseInstrumentation, SerializerPayload } from 'opentelemetry-instrumentation-mongoose';
import { IRequestUser } from './shared/types/request-user.interface';

export const configureTelemetry = (config: {
  connectionString: string;
  env: string;
  enableTelemetry: boolean;
  softwareVersion: string;
}) => {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
  if (config.enableTelemetry) {
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'FDPG-API_' + config.env,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.softwareVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.env,
        application: 'FDPG-API_' + config.env,
      }),
    );

    const provider = new NodeTracerProvider({ resource });

    const exporter = new AzureMonitorTraceExporter({
      connectionString: config.connectionString,
    });

    provider.addSpanProcessor(new BatchSpanProcessor(exporter));

    provider.register({
      propagator: new W3CTraceContextPropagator(),
    });

    registerInstrumentations({
      instrumentations: [
        new NestInstrumentation(),
        new HttpInstrumentation({
          ignoreOutgoingRequestHook: (request) => {
            return request.headers?.['x-no-trace']?.toString() === 'true';
          },
          ignoreIncomingRequestHook: (request) => {
            return request.url.includes('health');
          },
          applyCustomAttributesOnSpan: (span, request, response) => {
            if (request instanceof IncomingMessage) {
              const url = new URL(request.url, `http://${request.headers.host}`);
              const panelQuery = url.searchParams.get('panelQuery');
              const user = (request as any).user as IRequestUser;
              span.setAttributes({
                [SemanticResourceAttributes.SERVICE_VERSION]: config.softwareVersion,
                ['request.method']: request.method,
                ['request.user-agent']: request.headers['user-agent'],
                ['request.referer']: request.headers['referer'],
                ['request.panelQuery']: panelQuery,
                ['jwt.userInfo.userId']: user?.userId,
                ['jwt.userInfo.singleKnownRole']: user?.singleKnownRole,
                ['jwt.userInfo.miiLocation']: user?.miiLocation,
                ['jwt.userInfo.isFromLocation']: user?.isFromLocation,
                ['jwt.userInfo.isKnownLocation']: user?.isKnownLocation,
                ['jwt.userInfo.isInactiveLocation']: user?.isInactiveLocation,
                ['jwt.userInfo.roles']: user?.roles.join(', '),
              });

              if (response.statusCode > 399) {
                span.setStatus({ code: SpanStatusCode.ERROR });
              }
            }
          },
        }),
        new MongooseInstrumentation({
          // No traces for mongodb native client
          suppressInternalInstrumentation: true,
          dbStatementSerializer: (operation: string, payload: SerializerPayload) => {
            return `MONGO_STATEMENT: ${operation} ${JSON.stringify(payload)}`;
          },
        }),
      ],
    });
  }
};
