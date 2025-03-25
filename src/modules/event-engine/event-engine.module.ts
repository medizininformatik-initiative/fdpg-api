import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { Proposal, ProposalSchema } from '../proposal/schema/proposal.schema';
import { UserModule } from '../user/user.module';
import { EventEngineService } from './event-engine.service';
import { CommentEventService } from './events/comments/comment-event.service';
import { ContractingService } from './events/contracting/contracting.service';
import { LocationVoteService } from './events/location-vote/location-vote.service';
import { ProposalLockService } from './events/proposal-lock/proposal-lock.service';
import { StatusChangeService } from './events/status-change/status-change.service';
import { StatusReminderService } from './events/status-reminder/status-reminder.service';
import { ReportsService } from './events/reports/reports.service';
import { PublicationsService } from './events/publications/publications.service';
import { CommentAnswerEventService } from './events/comments/comment-answer-event.service';
import { DeadlineEventService } from './events/deadlines/deadline-event.service';

@Module({
  providers: [
    EventEngineService,
    StatusChangeService,
    StatusReminderService,
    CommentEventService,
    CommentAnswerEventService,
    LocationVoteService,
    ContractingService,
    ProposalLockService,
    ReportsService,
    PublicationsService,
    DeadlineEventService,
  ],
  imports: [
    MongooseModule.forFeature([
      {
        name: Proposal.name,
        schema: ProposalSchema,
      },
    ]),
    UserModule,
    EmailModule,
    CacheModule.register(),
  ],
  exports: [EventEngineService],
})
export class EventEngineModule {}
