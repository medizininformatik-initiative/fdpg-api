import { forwardRef, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { EmailModule } from '../email/email.module';
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
import { ParticipantEmailSummaryService } from './events/summary/participant-email-summary.service';
import { ProposalModule } from '../proposal/proposal.module';

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
    ParticipantEmailSummaryService,
  ],
  imports: [forwardRef(() => ProposalModule), UserModule, EmailModule, CacheModule.register()],
  exports: [EventEngineService],
})
export class EventEngineModule {}
