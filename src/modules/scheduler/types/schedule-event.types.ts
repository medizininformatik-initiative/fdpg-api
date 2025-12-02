import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ScheduleType } from '../enums/schedule-type.enum';

export type ProposalScheduleTypes =
  | ScheduleType.ReminderFdpgCheck
  | ScheduleType.ReminderLocationCheck1
  | ScheduleType.ReminderLocationCheck2
  | ScheduleType.ReminderLocationCheck3
  | ScheduleType.ReminderFinishedProject1
  | ScheduleType.ReminderFinishedProject2
  | ScheduleType.ReminderResearcherPublications
  | ScheduleType.ParticipatingResearcherSummary;

export interface IProposalScheduleEventSet {
  types: ProposalScheduleTypes[];
  proposal: Proposal;
}
