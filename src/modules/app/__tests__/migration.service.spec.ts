import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { AppDbIdentifier } from '../enums/app-db-identifier.enum';
import { MigrationService } from '../migration.service';
import { Migration, MigrationDocument } from '../schema/migration.schema';
import { Connection } from 'mongoose';
import { KeycloakService } from 'src/modules/user/keycloak.service';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';

const mockMigration000 = {
  up: jest.fn(),
  down: jest.fn(),
};

jest.mock('../migrations', () => ({
  Migration000: jest.fn().mockImplementation(() => mockMigration000),
  Migration007: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration008: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration009: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration010: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration011: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration012: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration013: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration014: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration015: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration016: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration017: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
  Migration018: jest.fn().mockImplementation(() => ({
    up: jest.fn(),
    down: jest.fn(),
  })),
}));

describe('MigrationService', () => {
  let service: MigrationService;
  let connection: Connection;
  let migrationModel: Model<MigrationDocument>;

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
        {
          provide: getModelToken('ProposalForm'),
          useValue: {},
        },
        {
          provide: ProposalFormService,
          useValue: {
            getCurrentVersion: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
    migrationModel = module.get<Model<MigrationDocument>>(getModelToken('Migration'));
    connection = module.get<Connection>(getConnectionToken('Database'));

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
      expect(mockMigration000.up).toHaveBeenCalledTimes(1);
    });

    it('should upgrade the db', async () => {
      (service as any).desiredDbVersion = 0;
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
      expect(mockMigration000.up).not.toHaveBeenCalled();
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
      expect(mockMigration000.up).not.toHaveBeenCalled();
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

      expect(connection.startSession).toBeCalledTimes(0);
      expect(startTransaction).toBeCalledTimes(0);
      expect(endSession).toBeCalledTimes(0);
    });

    it('should abort a transaction on error', async () => {
      (service as any).desiredDbVersion = 1;
      (service as any).preventDowngrade = false;
      let dbVersion = 0;
      jest.spyOn(migrationModel, 'findOne').mockImplementation(() => {
        const dbVersionOld = dbVersion;
        dbVersion = 1;
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

      await expect(service.onModuleInit()).rejects.toBe('Error');

      expect(connection.startSession).toBeCalledTimes(1);
      expect(startTransaction).toBeCalledTimes(1);
      expect(abortTransaction).toBeCalledTimes(1);
      expect(endSession).toBeCalledTimes(1);
    });
  });
});
