import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { TermsConfigDocument } from 'src/modules/admin/schema/terms/terms-config.schema';
import { AppDbIdentifier } from '../enums/app-db-identifier.enum';
import { MigrationService } from '../migration.service';
import {
  Migration000,
  Migration001,
  Migration002,
  Migration003,
  Migration004,
  Migration005,
  Migration006,
} from '../migrations';
import { Migration, MigrationDocument } from '../schema/migration.schema';
import { Connection } from 'mongoose';
import { getError } from 'test/get-error';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { KeycloakService } from 'src/modules/user/keycloak.service';

jest.mock('../migrations');

describe('MigrationService', () => {
  let service: MigrationService;
  let connection: Connection;
  let migrationModel: Model<MigrationDocument>;
  let termsConfigModel: Model<TermsConfigDocument>;
  let proposalModel: Model<ProposalDocument>;

  let migration000: jest.Mocked<Migration000>;
  let migration001: jest.Mocked<Migration001>;
  let migration002: jest.Mocked<Migration002>;
  let migration003: jest.Mocked<Migration003>;
  let migration004: jest.Mocked<Migration004>;
  let migration005: jest.Mocked<Migration005>;
  let migration006: jest.Mocked<Migration006>;

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
    proposalModel = module.get<Model<ProposalDocument>>(getModelToken('Proposal'));

    connection = module.get<Connection>(getConnectionToken('Database'));

    migration000 = new Migration000(migrationModel) as jest.Mocked<Migration000>;
    migration001 = new Migration001(termsConfigModel) as jest.Mocked<Migration001>;

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
      expect(migration001.up).toHaveBeenCalledTimes(1);
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
      expect(migration001.up).not.toHaveBeenCalled();

      if (preventDowngrade) {
        expect(migration001.down).not.toHaveBeenCalledTimes(1);
      } else {
        expect(migration001.down).toHaveBeenCalledTimes(1);
      }
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
