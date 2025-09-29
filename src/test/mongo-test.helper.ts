import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { DynamicModule, ForwardReference, INestApplication, Provider, Type } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { ConfigModule } from '@nestjs/config';
import { Wait } from 'testcontainers';
import { ScheduleModule } from '@nestjs/schedule';

// Define an interface for the context that will be passed to the tests
export interface MongoTestContext {
  app: INestApplication;
  container: StartedMongoDBContainer;
  mongoUri: string;
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
  overrides: Provider[] = [],
  tests: (context: () => MongoTestContext) => void,
) {
  describe(suiteName, () => {
    const context = {} as MongoTestContext;

    const tearDownContainer = async (context: MongoTestContext) => {
      try {
        await context.app?.close();
      } catch (error) {
        console.warn(`[${suiteName}] Error closing NestJS app:`, error);
      }
      try {
        await context.container?.stop();
        console.log(`[${suiteName}] Container stopped successfully.`);
      } catch (error) {
        console.error(`[${suiteName}] FAILED to stop the container:`, error);
      }
    };

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
            ScheduleModule.forRoot(),
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
          moduleBuilder = overrides.reduce((builder, provider) => {
            // A provider can be a class or an object with a `provide` property
            const token = (provider as any).provide || provider;
            const value = (provider as any).useValue;
            return builder.overrideProvider(token).useValue(value);
          }, moduleBuilder);
        }

        const moduleFixture = await moduleBuilder.compile();
        const app = moduleFixture.createNestApplication();
        await app.init();

        Object.assign(context, { app, container, mongoUri });
      } catch (error) {
        console.error('FATAL ERROR DURING TEST SETUP:', error);

        await tearDownContainer(context);

        throw error;
      }
    }, 450000);

    afterAll(async () => {
      await tearDownContainer(context);
    });

    tests(() => context);
  });
}
