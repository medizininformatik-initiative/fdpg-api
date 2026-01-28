import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ScheduleType } from '../enums/schedule-type.enum';

type ProposalScheduleTypes =
  | ScheduleType.ReminderFdpgCheck
  | ScheduleType.ReminderLocationCheck1
  | ScheduleType.ReminderLocationCheck2
  | ScheduleType.ReminderLocationCheck3
  | ScheduleType.ReminderResearcherPublications
  | ScheduleType.ParticipatingResearcherSummary;

export interface IProposalScheduleEventSet {
  types: ProposalScheduleTypes[];
  proposal: Proposal;
}
