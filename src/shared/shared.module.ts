import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AzureStorageModule } from 'src/modules/azure-storage/azure-storage.module';
import { Comment, CommentSchema } from 'src/modules/comment/schema/comment.schema';
import { Proposal, ProposalSchema } from 'src/modules/proposal/schema/proposal.schema';
import { SchedulerModule } from 'src/modules/scheduler/scheduler.module';
import { SharedService } from './shared.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Proposal.name,
        schema: ProposalSchema,
      },
      {
        name: Comment.name,
        schema: CommentSchema,
      },
    ]),
    AzureStorageModule,
    SchedulerModule,
  ],
  controllers: [],
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}
