import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { HistoryEventType } from 'src/modules/proposal/enums/history-event.enum';

export const buildParticipatingEmailSummary = (
  validContacts: string[],
  changes: HistoryEventType[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.ParticipatingScientistSummary],
  templateId: 46,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    projectLink: proposalUrl,
    conditionProposalRejected: changes.includes(HistoryEventType.ProposalRejected),
    conditionProposalFdpgCheck: changes.includes(HistoryEventType.ProposalFdpgCheck),
    conditionProposalLocationCheck: changes.includes(HistoryEventType.ProposalLocationCheck),
    conditionProposalContracting: changes.includes(HistoryEventType.ProposalContracting),
    conditionProposalDataDelivery: changes.includes(HistoryEventType.ProposalDataDelivery),
    conditionProposalDataResearch: changes.includes(HistoryEventType.ProposalDataResearch),
    conditionProposalFinished: changes.includes(HistoryEventType.ProposalFinished),
  },
});
