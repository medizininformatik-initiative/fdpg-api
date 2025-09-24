import { Module } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Comment, getCommentSchemaFactory } from 'src/modules/comment/schema/comment.schema';
import { EventEngineModule } from '../event-engine/event-engine.module';
import { ProposalModule } from '../proposal/proposal.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { LocationModule } from '../location/location.module';
import { Connection } from 'mongoose';
import { Location } from '../location/schema/location.schema';

@Module({
  imports: [
    LocationModule,
    ProposalModule,
    EventEngineModule,
    MongooseModule.forFeatureAsync([
      {
        name: Comment.name,
        inject: [getConnectionToken()],
        useFactory: (connection: Connection) => {
          const LocationModel = connection.model<Location>(Location.name);
          return getCommentSchemaFactory(LocationModel);
        },
      },
    ]),
  ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
