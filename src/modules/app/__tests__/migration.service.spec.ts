import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { TermsConfigDocument } from 'src/modules/admin/schema/terms/terms-config.schema';
import { AppDbIdentifier } from '../enums/app-db-identifier.enum';
import { MigrationService } from '../migration.service';
import { Migration000 } from '../migrations';
import { Migration, MigrationDocument } from '../schema/migration.schema';
import { Connection } from 'mongoose';
import { getError } from 'test/get-error';
import { KeycloakService } from 'src/modules/user/keycloak.service';
import { DataPrivacyConfigDocument } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';

jest.mock('../migrations');

describe('MigrationService', () => {
  let service: MigrationService;
  let connection: Connection;
  let migrationModel: Model<MigrationDocument>;
  let termsConfigModel: Model<TermsConfigDocument>;
  let dataPrivacyConfigModel: Model<DataPrivacyConfigDocument>;

  let migration000: jest.Mocked<Migration000>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        {
          provide: getConnectionToken('Database'),
          useValue: {
            startSession: jest.fn().mockImplementation(() => ({
              startTransaction: jest.fn(),
              abortTransaction: jest.fn(),
              endSession: jest.fn(),
            })),
          },
        },
        {
          provide: getModelToken('Migration'),
          useValue: {
            new: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            constructor: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken('TermsConfig'),
          useValue: {},
        },
        {
          provide: getModelToken('DataPrivacyConfig'),
          useValue: {},
        },
        {
          provide: getModelToken('Proposal'),
          useValue: {},
        },
        {
          provide: KeycloakService,
          useValue: {},
        },
      ],
      imports: [],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
    migrationModel = module.get<Model<MigrationDocument>>(getModelToken('Migration'));
    termsConfigModel = module.get<Model<TermsConfigDocument>>(getModelToken('TermsConfig'));
    dataPrivacyConfigModel = module.get<Model<DataPrivacyConfigDocument>>(getModelToken('DataPrivacyConfig'));

    connection = module.get<Connection>(getConnectionToken('Database'));

    migration000 = new Migration000(
      migrationModel,
      termsConfigModel,
      dataPrivacyConfigModel,
    ) as jest.Mocked<Migration000>;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Module Init', () => {
    it('should initialize the migration if not existing', async () => {
      (service as any).desiredDbVersion = 0;
      let dbVersion = undefined;
      jest.spyOn(migrationModel, 'findOne').mockImplementation(() => {
        const dbVersionOld = dbVersion;
        dbVersion = 0;
        return {
          dbVersion: dbVersionOld,
        } as Migration as any;
      });

      await service.onModuleInit();

      expect(migrationModel.findOne).toHaveBeenCalledWith({ id: AppDbIdentifier.Migration });
      expect(migration000.up).toHaveBeenCalledTimes(1);
    });

    it('should upgrade the db', async () => {
      (service as any).desiredDbVersion = 1;
      let dbVersion = 0;
      jest.spyOn(migrationModel, 'findOne').mockImplementation(() => {
        const dbVersionOld = dbVersion;
        dbVersion = 1;
        return {
          dbVersion: dbVersionOld,
          save: jest.fn(),
        } as any;
      });

      await service.onModuleInit();

      expect(migrationModel.findOne).toHaveBeenCalledWith({ id: AppDbIdentifier.Migration });
      expect(migration000.up).not.toHaveBeenCalled();
    });

    test.each([true, false])('should downgrade the db if desired', async (preventDowngrade: boolean) => {
      (service as any).desiredDbVersion = 0;
      (service as any).preventDowngrade = preventDowngrade;
      let dbVersion = 1;
      jest.spyOn(migrationModel, 'findOne').mockImplementation(() => {
        const dbVersionOld = dbVersion;
        dbVersion = 0;
        return {
          dbVersion: dbVersionOld,
          save: jest.fn(),
        } as any;
      });

      await service.onModuleInit();

      expect(migrationModel.findOne).toHaveBeenCalledWith({ id: AppDbIdentifier.Migration });
      expect(migration000.up).not.toHaveBeenCalled();
    });
  });
  describe('DB Sessions', () => {
    it('should start and end a session', async () => {
      (service as any).desiredDbVersion = 0;
      (service as any).preventDowngrade = false;
      let dbVersion = 1;
      jest.spyOn(migrationModel, 'findOne').mockImplementation(() => {
        const dbVersionOld = dbVersion;
        dbVersion = 0;
        return {
          dbVersion: dbVersionOld,
          save: jest.fn(),
        } as any;
      });

      const startTransaction = jest.fn();
      const endSession = jest.fn();
      jest.spyOn(connection, 'startSession').mockReturnValueOnce({
        startTransaction,
        endSession,
      } as any);

      await service.onModuleInit();

      expect(connection.startSession).toBeCalledTimes(1);
      expect(startTransaction).toBeCalledTimes(1);
      expect(endSession).toBeCalledTimes(1);
    });

    test.each(['up', 'down'])('should abort a transaction on error', async (direction: 'up' | 'down') => {
      (service as any).desiredDbVersion = direction === 'up' ? 1 : 0;
      (service as any).preventDowngrade = false;
      let dbVersion = direction === 'up' ? 0 : 1;
      jest.spyOn(migrationModel, 'findOne').mockImplementation(() => {
        const dbVersionOld = dbVersion;
        dbVersion = direction === 'up' ? 1 : 0;
        return {
          dbVersion: dbVersionOld,
          save: jest.fn().mockRejectedValueOnce('Error'),
        } as any;
      });

      const startTransaction = jest.fn();
      const endSession = jest.fn();
      const abortTransaction = jest.fn();
      jest.spyOn(connection, 'startSession').mockReturnValueOnce({
        startTransaction,
        endSession,
        abortTransaction,
      } as any);

      const call = service.onModuleInit();
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(connection.startSession).toBeCalledTimes(1);
      expect(startTransaction).toBeCalledTimes(1);
      expect(endSession).toBeCalledTimes(1);
      expect(abortTransaction).toBeCalledTimes(1);
    });
  });
});
