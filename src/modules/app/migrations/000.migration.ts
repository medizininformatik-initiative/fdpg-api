import { Model } from 'mongoose';
import { MigrationDocument } from '../schema/migration.schema';
import { IDbMigration } from '../types/db-migration.interface';

export class Migration000 implements IDbMigration {
  constructor(private migrationModel: Model<MigrationDocument>) {}

  async up() {
    console.log('Setup Initial DB Migration');
    const model = new this.migrationModel();
    model.updatedAt = new Date();
    await model.save({ validateBeforeSave: false });
  }

  async down() {
    console.log('Already least db version');
  }
}
