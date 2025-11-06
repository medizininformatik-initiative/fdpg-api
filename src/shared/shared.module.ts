import { Module } from '@nestjs/common';
import { StorageModule } from 'src/modules/storage/storage.module';
import { SchedulerModule } from 'src/modules/scheduler/scheduler.module';
import { SharedService } from './shared.service';
import { LocationModule } from 'src/modules/location/location.module';
import { getProposalSchemaFactory, Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Comment, getCommentSchemaFactory } from 'src/modules/comment/schema/comment.schema';
import { Connection } from 'mongoose';
import { Location } from 'src/modules/location/schema/location.schema';
import { ParseOptionalBodyPipe } from './utils/optional-body-pipe.util';

@Module({
  imports: [
    LocationModule,
    MongooseModule.forFeatureAsync([
      {
        name: Proposal.name,
        inject: [getConnectionToken()],
        useFactory: (connection: Connection) => {
          const LocationModel = connection.model<Location>(Location.name);
          return getProposalSchemaFactory(LocationModel);
        },
      },
      {
        name: Comment.name,
        inject: [getConnectionToken()],
        useFactory: (connection: Connection) => {
          const LocationModel = connection.model<Location>(Location.name);
          return getCommentSchemaFactory(LocationModel);
        },
      },
    ]),
    StorageModule,
    SchedulerModule,
  ],
  controllers: [],
  providers: [SharedService, ParseOptionalBodyPipe],
  exports: [SharedService, ParseOptionalBodyPipe],
})
export class SharedModule {}
