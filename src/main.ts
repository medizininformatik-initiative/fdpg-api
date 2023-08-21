import { configureTelemetry } from './telemetry';
import * as dotenv from 'dotenv';

dotenv.config({ path: `.env.local` });
dotenv.config();

configureTelemetry({
  env: process.env.ENV,
  connectionString: process.env.OTEL_EXPORTER_CONNECTION_STRING,
  enableTelemetry: (process.env.ENABLE_TELEMETRY ?? '').toLowerCase() === 'true',
  softwareVersion: process.env.SOFTWARE_VERSION,
});

import { ConfigService } from '@nestjs/config';
import { INestApplication, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { useContainer } from 'class-validator';
import * as mongoose from 'mongoose';
import { ValidationExceptionFilter } from './exceptions/validation/validation-exception.filter';
import { AppModule } from './modules/app/app.module';
import { API_PREFIX } from './shared/constants/global.constants';

// Configure swagger function
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
        initOAuth: {
          clientId: oauth2Client,
          realm: keycloakRealm,
          appName: '\n\n !!! Public Client !!! Client Secret should remain empty !!!',
          scopeSeparator: ',',
        },
      },
    };

    const buildInfo = [
      `Release Date: ${configService.get('RELEASE_DATE')}`,
      `Release Time: ${configService.get('RELEASE_TIME')}`,
      `Release Number of Date: ${configService.get('RELEASE_NO_OF_DATE')}`,
      `Environment: ${configService.get('ENV')}`,
    ];

    const swaggerConfig = new DocumentBuilder()
      .setTitle('FDPG API')
      .setDescription('<h3> Build Information:</strong> </h3>' + buildInfo.join('</br>'))
      .setVersion(softwareVersion)
      .addOAuth2(securitySchemeObject)
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(swaggerPath, app, document, swaggerCustomOptions);
  }
}

function configureCors(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const environment = configService.get('ENV');

  const corsDefaults = {
    origin: ['http://localhost:8080', 'http://localhost:8081'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  if (environment == 'local') {
    app.enableCors(corsDefaults);
  } else {
    const corsOrigins = configService.get('CORS_ORIGINS');
    const origins = [];
    try {
      corsOrigins.split(',').forEach((origin) => origins.push(origin));
    } catch (error) {
      console.log(`Failed parsing CORS Origins from env INPUT: ${corsOrigins} `);
      console.log(`Failed parsing CORS Origins from env ERROR: ${error} `);
    }
    app.enableCors({
      ...corsDefaults,
      origin: origins,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new ValidationExceptionFilter());
  app.enableVersioning({ type: VersioningType.URI });

  configureSwagger(app);
  configureCors(app);

  if (process.env.ENV !== 'production') {
    mongoose.set('debug', true);
  }

  // Adds DI for validators:
  // https://github.com/nestjs/nest/issues/528
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(3000);
}

bootstrap();
