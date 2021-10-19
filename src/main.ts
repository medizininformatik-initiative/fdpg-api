import { INestApplication, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as mongoose from 'mongoose';
import { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ConfigService } from '@nestjs/config';

async function configureApplicationInsights() {
  if (process.env.ENV !== 'local') {
    const appInsights = await import('applicationinsights');
    appInsights
      .setup()
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(true)
      .setAutoCollectHeartbeat(true)
      .start();
  }
}

function configureSwagger(app: INestApplication) {
  if (process.env.ENV !== 'production') {
    const configService = app.get(ConfigService);
    const softwareVersion = configService.get('SOFTWARE_VERSION');
    const keycloakHost = configService.get('KEYCLOAK_HOST');
    const keycloakRealm = configService.get('KEYCLOAK_REALM');
    const oauth2Endpoint = `${keycloakHost}/auth/realms/${keycloakRealm}/protocol/openid-connect`;
    const oauth2Client = configService.get('OAUTH2_CLIENT');

    const swaggerPath = 'api/swagger-ui';
    const securitySchemeObject: SecuritySchemeObject = {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: `${oauth2Endpoint}/auth`,
          tokenUrl: `${oauth2Endpoint}/token`,
          scopes: {},
        },
      },
    };

    const swaggerCustomOptions: SwaggerCustomOptions = {
      customJs: '/swagger-fix.js',
      swaggerOptions: {
        oauth2RedirectUrl: swaggerPath,
        oauth: {
          clientId: oauth2Client,
          realm: keycloakRealm,
          appName:
            '\n\n !!! Public Client !!! Client Secret should remain empty !!!',
          scopeSeparator: ',',
        },
      },
    };

    const buildInfo = [
      `Build Date: ${configService.get('BUILD_DATE')}`,
      `Build Time: ${configService.get('BUILD_TIME')}`,
      `Build Number of Date: ${configService.get('BUILD_NO_OF_DATE')}`,
      `Source Branch: ${configService.get('SOURCE_BRANCH')}`,
      `Environment: ${configService.get('ENV')}`,
    ];

    const swaggerConfig = new DocumentBuilder()
      .setTitle('FDPG API')
      .setDescription(
        '<h3> Build Information:</strong> </h3>' + buildInfo.join('</br>'),
      )
      .setVersion(softwareVersion)
      .addOAuth2(securitySchemeObject)
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(swaggerPath, app, document, swaggerCustomOptions);
  }
}

async function bootstrap() {
  configureApplicationInsights();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  configureSwagger(app);

  // TODO: Check: Needed for Application Insights?
  mongoose.set('debug', true);

  await app.listen(3000);
}

bootstrap();
