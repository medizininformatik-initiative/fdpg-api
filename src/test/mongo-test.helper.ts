import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { DynamicModule, ForwardReference, INestApplication, Provider, Type } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { ConfigModule } from '@nestjs/config';
import { Network, StartedNetwork, Wait } from 'testcontainers';
import { ScheduleModule } from '@nestjs/schedule';
import { Connection } from 'mongoose';

// Define an interface for the context that will be passed to the tests
export interface MongoTestContext {
  app: INestApplication;
  container: StartedMongoDBContainer;
  mongoUri: string;
  network: StartedNetwork;
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
        if (context.app) {
          const connection = context.app.get<Connection>(getConnectionToken());
          await connection.db.dropDatabase();
        }
      } catch (error) {
        console.warn(`[${suiteName}] Error dropping database:`, error);
      }

      try {
        await context.app?.close();
      } catch (error) {
        console.warn(`[${suiteName}] Error closing NestJS app:`, error);
      }
      try {
        await context.container?.stop();
      } catch (error) {
        console.error(`[${suiteName}] FAILED to stop the container:`, error);
      }

      try {
        await context.network?.stop();
      } catch (error) {
        console.error(`[${suiteName}] FAILED to stop the network:`, error);
      }
    };

    beforeAll(async () => {
      try {
        const network = await new Network().start();

        Object.assign(context, { network });

        const container = await new MongoDBContainer('mongo:7.0')
          .withCommand(['mongod', '--replSet', 'rs0', '--noauth'])
          .withWaitStrategy(Wait.forLogMessage('Waiting for connections'))
          .withNetwork(network)
          .withAutoRemove(true)
          .withName('fdpg-api-mongodb-testcontainer')
          .start();

        Object.assign(context, { container });

        await container.exec(['mongosh', '--eval', 'rs.initiate()']);

        const host = 'localhost';
        const port = container.getMappedPort(27017);
        const mongoUri = `mongodb://${host}:${port}/test_${encodeURI(suiteName)}?replicaSet=rs0&directConnection=true`;

        Object.assign(context, { mongoUri });

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

        Object.assign(context, { app });
      } catch (error) {
        console.error('FATAL ERROR DURING TEST SETUP:', error);

        await tearDownContainer(context);

        throw error;
      }
    }, 45000);

    it('should have a defined app context', () => {
      expect(context).toBeDefined();
      expect(context.app).toBeDefined();
    });

    tests(() => context);

    afterAll(async () => {
      await tearDownContainer(context);
    });
  });
}
