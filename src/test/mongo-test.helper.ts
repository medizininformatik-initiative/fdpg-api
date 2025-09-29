import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { DynamicModule, ForwardReference, INestApplication, Type } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { ConfigModule } from '@nestjs/config';
import { Wait } from 'testcontainers';

// Define an interface for the context that will be passed to the tests
export interface MongoTestContext {
  app: INestApplication;
  container: StartedMongoDBContainer;
  mongoUri: string;
}

export interface ProviderOverride {
  token: any; // The injection token of the provider to override
  value: any; // The mock value/object to use instead
}

/**
 * A higher-order function that wraps a Jest `describe` block to provide
 * a running MongoDB container on a random, available port.
 *
 * @param suiteName The name of the test suite.
 * @param tests A function that contains your tests. It receives the test context.
 */
export function describeWithMongo(
  suiteName: string,
  modules: (Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference<any>)[] = [],
  overrides: ProviderOverride[] = [],
  tests: (context: () => MongoTestContext) => void,
) {
  describe(suiteName, () => {
    const context = {} as MongoTestContext;

    beforeAll(async () => {
      try {
        const container = await new MongoDBContainer('mongo:7.0')
          .withCommand(['mongod', '--replSet', 'rs0', '--noauth'])
          .withWaitStrategy(Wait.forLogMessage('Waiting for connections'))
          .withAutoRemove(true)
          .withName('fdpg-api-testcontainer')
          .start();

        await container.exec(['mongosh', '--eval', 'rs.initiate()']);

        const host = 'localhost';
        const port = container.getMappedPort(27017);
        const mongoUri = `mongodb://${host}:${port}/test?replicaSet=rs0&directConnection=true`;

        let moduleBuilder: TestingModuleBuilder = Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.test'] }),
            MongooseModule.forRootAsync({
              useFactory: () => ({
                uri: mongoUri,
                appName: 'api-backend',
              }),
            }),
            ...modules,
          ],
        });

        if (overrides && overrides.length > 0) {
          moduleBuilder = overrides.reduce(
            (builder, override) => builder.overrideProvider(override.token).useValue(override.value),
            moduleBuilder,
          );
        }

        const moduleFixture = await moduleBuilder.compile();
        const app = moduleFixture.createNestApplication();
        await app.init();

        Object.assign(context, { app, container, mongoUri });
      } catch (error) {
        console.error('FATAL ERROR DURING TEST SETUP:', error);
        throw error;
      }
    }, 450000);

    afterAll(async () => {
      console.log(`[${suiteName}] Tearing down...`);
      try {
        await context.app?.close();
      } catch (e) {
        console.warn(e);
      }
      await context.container?.stop();
    });

    tests(() => context);
  });
}
