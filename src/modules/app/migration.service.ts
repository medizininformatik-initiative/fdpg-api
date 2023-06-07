import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { TermsConfig, TermsConfigDocument } from '../admin/schema/terms/terms-config.schema';
import { Proposal, ProposalDocument } from '../proposal/schema/proposal.schema';
import { KeycloakService } from '../user/keycloak.service';
import { AppDbIdentifier } from './enums/app-db-identifier.enum';
import {
  Migration000,
  Migration001,
  Migration002,
  Migration003,
  Migration004,
  Migration005,
  Migration006,
} from './migrations';
import { Migration, MigrationDocument } from './schema/migration.schema';
import { IDbMigration } from './types/db-migration.interface';
import { DataPrivacyConfig, DataPrivacyConfigDocument } from '../admin/schema/data-privacy/data-privacy-config.schema';

@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Migration.name)
    private migrationModel: Model<MigrationDocument>,
    @InjectModel(TermsConfig.name)
    private termsConfigModel: Model<TermsConfigDocument>,
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    @InjectModel(DataPrivacyConfig.name)
    private dataPrivacyConfigModel: Model<DataPrivacyConfigDocument>,
    private keycloakService: KeycloakService,
  ) {}

  private readonly desiredDbVersion = 6;

  // Migration downgrades are not supported while downgrading the software version. So it's disabled by default.
  private readonly preventDowngrade = true;

  private readonly migrations: Record<number, IDbMigration> = {
    0: new Migration000(this.migrationModel),
    1: new Migration001(this.termsConfigModel),
    2: new Migration002(this.proposalModel, this.keycloakService),
    3: new Migration003(this.proposalModel),
    4: new Migration004(this.proposalModel),
    5: new Migration005(this.proposalModel),
    6: new Migration006(this.proposalModel, this.dataPrivacyConfigModel),
  };

  private async runMigration(currentVersion?: number) {
    if (currentVersion === undefined) {
      await this.migrations[0].up();
      // Check for next migration
      await this.onModuleInit();
    } else if (currentVersion < this.desiredDbVersion) {
      await this.upgrade(currentVersion);
      // Check for next migration
      await this.onModuleInit();
    } else if (currentVersion > this.desiredDbVersion && !this.preventDowngrade) {
      await this.downgrade(currentVersion);
      // Check for next migration
      await this.onModuleInit();
    }
  }

  private async upgrade(currentVersion: number) {
    const session = await this.connection.startSession();
    session.startTransaction();

    const migration = await this.migrationModel.findOne({ id: AppDbIdentifier.Migration });

    const newVersion = currentVersion + 1;
    console.log(`Upgrading DB to Version: ${newVersion}`);

    try {
      if (this.migrations[newVersion]) {
        await this.migrations[newVersion].up(newVersion);
        migration.updatedAt = new Date();
        migration.dbVersion = newVersion;
        await migration.save();
      } else {
        const countOfMigrations = Object.keys(this.migrations).length;
        throw new Error(
          `Could not find migration file to upgrade for new version ${newVersion}. Count of migrations: ${countOfMigrations}`,
        );
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async downgrade(currentVersion: number) {
    const session = await this.connection.startSession();
    session.startTransaction();

    const migration = await this.migrationModel.findOne({ id: AppDbIdentifier.Migration });

    const newVersion = currentVersion - 1;
    console.log(`Downgrading DB to Version: ${newVersion}`);

    try {
      if (this.migrations[currentVersion]) {
        await this.migrations[currentVersion].down();
        migration.updatedAt = new Date();
        migration.dbVersion = newVersion;
        await migration.save();
      } else {
        const countOfMigrations = Object.keys(this.migrations).length;
        throw new Error(
          `Could not find migration file to downgrade for current version ${currentVersion}. Count of migrations: ${countOfMigrations}`,
        );
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async onModuleInit() {
    try {
      console.log('Checking DB Migrations...');
      const migration = await this.migrationModel.findOne({ id: AppDbIdentifier.Migration });
      console.log(`Desired DB Version: ${this.desiredDbVersion}`);
      console.log(`Current DB Version: ${migration?.dbVersion}`);

      if (migration?.dbVersion !== this.desiredDbVersion) {
        await this.runMigration(migration?.dbVersion);
      } else {
        console.log('No DB Migration needed');
        console.log(`Last DB Migration at: ${migration?.updatedAt}`);
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
