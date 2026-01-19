import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { DynamicModule, INestApplication, Provider, Type } from '@nestjs/common';
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

export interface ServiceConfig {
  provide: Type<any>;
  useValue?: any;
  useClass?: Type<any>;
}

/**
 * A higher-order function that wraps a Jest `describe` block to provide
 * a running MongoDB container on a random, available port.
 *
 * @param suiteName The name of the test suite.
 * @param services Array of services to provide. Can be classes, service configs, or dynamic modules.
 * @param tests A function that contains your tests. It receives the test context.
 */
export function describeWithMongo(
  suiteName: string,
  services: (Type<any> | ServiceConfig | DynamicModule)[] = [],
  tests: (context: () => MongoTestContext) => void,
) {
  describe(suiteName, () => {
    const context = {} as MongoTestContext;

    const tearDownContainer = async (context: MongoTestContext) => {
      try {
        if (context.app) {
          const connection = context.app.get<Connection>(getConnectionToken());
          await connection.db.dropDatabase();
          // Explicitly close the Mongoose connection
          await connection.close();
        }
      } catch (error) {
        console.warn(`[${suiteName}] Error dropping database:`, error);
      }

      try {
        if (context.app) {
          await context.app.close();
        }
      } catch (error) {
        console.warn(`[${suiteName}] Error closing NestJS app:`, error);
      }

      try {
        if (context.container) {
          await context.container.stop({ remove: true, removeVolumes: true });
          console.log(`[${suiteName}] Container stopped and removed`);
        }
      } catch (error) {
        console.error(`[${suiteName}] FAILED to stop the container:`, error);
      }

      try {
        if (context.network) {
          await context.network.stop();
          console.log(`[${suiteName}] Network stopped`);
        }
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

        // Separate imports and providers
        const imports: DynamicModule[] = [];
        const providers: Provider[] = [];

        services.forEach((service) => {
          if (typeof service === 'function') {
            // It's a class - add to providers
            providers.push(service);
          } else if ('module' in service) {
            // It's a DynamicModule - add to imports
            imports.push(service as DynamicModule);
          } else {
            // It's a ServiceConfig - add to providers
            providers.push(service as Provider);
          }
        });

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
            ...imports,
          ],
          providers,
        });

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

    afterEach(async () => {
      // Clean all collections after each test to ensure isolation
      try {
        if (context.app) {
          const connection = context.app.get<Connection>(getConnectionToken());
          const collections = await connection.db.collections();

          // Clear all collections in parallel
          await Promise.all(collections.map((collection) => collection.deleteMany({})));
        }
      } catch (error) {
        console.warn(`[${suiteName}] Error cleaning collections after test:`, error);
      }
    });

    afterAll(async () => {
      await tearDownContainer(context);
    }, 30000);
  });
}
