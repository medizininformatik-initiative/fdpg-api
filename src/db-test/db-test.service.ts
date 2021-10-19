import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DbTest, DbTestDocument } from './schemas/db-test.schema';

@Injectable()
export class DbTestService {
  constructor(
    @InjectModel(DbTest.name) private dbTestModel: Model<DbTestDocument>,
  ) {}

  async findAll(): Promise<DbTest[]> {
    return this.dbTestModel.find().exec();
  }
}
