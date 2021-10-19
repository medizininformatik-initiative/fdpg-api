import { Module } from '@nestjs/common';
import { DbTestService } from './db-test.service';
import { DbTestController } from './db-test.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DbTest, DbTestSchema } from './schemas/db-test.schema';

@Module({
  controllers: [DbTestController],
  providers: [DbTestService],
  imports: [
    MongooseModule.forFeature([{ name: DbTest.name, schema: DbTestSchema }]),
  ],
})
export class DbTestModule {}
