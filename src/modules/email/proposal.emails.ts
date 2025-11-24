import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { getLocaleDateString } from 'src/shared/utils/date.utils';
import { ProposalWithoutContent } from '../event-engine/types/proposal-without-content.type';
import { HistoryEventType } from '../proposal/enums/history-event.enum';
import { EmailParameterMap } from './types/template-email-param-keys.types';

export const buildParticipatingEmailSummary = (
  validContacts: string[],
  changes: HistoryEventType[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): ITemplateEmail => {
  const projectResearchers = [
    `${proposal.projectResponsible.researcher.firstName} ${proposal.projectResponsible.researcher.lastName}`,
    ...(proposal.participants
      ? proposal.participants.map(
          (participant) => `${participant.researcher.firstName} ${participant.researcher.lastName}`,
        )
      : []),
  ];

  return {
    to: validContacts,
    categories: [EmailCategory.ParticipatingScientistSummary],
    templateId: 46,
    params: {
      projectAbbreviation: proposal.projectAbbreviation,
      projectLink: proposalUrl,
      projectResearchers,
      conditionProposalRejected: changes.includes(HistoryEventType.ProposalRejected),
      conditionProposalRework: changes.includes(HistoryEventType.ProposalRework),
      conditionProposalFdpgCheck: changes.includes(HistoryEventType.ProposalFdpgCheck),
      conditionProposalLocationCheck: changes.includes(HistoryEventType.ProposalLocationCheck),
      conditionProposalContracting: changes.includes(HistoryEventType.ProposalContracting),
      conditionProposalDataDelivery: changes.includes(HistoryEventType.ProposalDataDelivery),
      conditionProposalDataResearch: changes.includes(HistoryEventType.ProposalDataResearch),
      conditionProposalFinished: changes.includes(HistoryEventType.ProposalFinished),
      conditionProposalConcluded: false, // changes.includes(HistoryEventType.Concluded),
      conditionProposalArchived: changes.includes(HistoryEventType.ProposalArchived),
    },
  };
};

export const researcherEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: EmailParameterMap,
): ITemplateEmail => {
  return {
    to: validContacts,
    categories,
    templateId: 57,
    params: {
      projectAbbreviation: proposal.projectAbbreviation,
      projectLink,
      conditionProposalRejected: !!emailParameterMap['conditionProposalRejected'],
      conditionProposalRework: !!emailParameterMap['conditionProposalRework'],
      conditionProposalFdpgCheck: !!emailParameterMap['conditionProposalFdpgCheck'],
      conditionProposalLocationCheck: !!emailParameterMap['conditionProposalLocationCheck'],
      conditionProposalContracting: !!emailParameterMap['conditionProposalContracting'],
      conditionProposalDataDelivery: !!emailParameterMap['conditionProposalDataDelivery'],
      conditionProposalDataReady: !!emailParameterMap['conditionProposalDataReady'],
      conditionProposalDataResearch: !!emailParameterMap['conditionProposalDataResearch'],
      conditionProposalFinished: !!emailParameterMap['conditionProposalFinished'],
      conditionProposalConcluded: !!emailParameterMap['conditionProposalConcluded'],
      conditionProposalArchived: !!emailParameterMap['conditionProposalArchived'],
      conditionProposalLocked: !!emailParameterMap['conditionProposalLocked'],
      conditionProposalUnlocked: !!emailParameterMap['conditionProposalUnlocked'],
    },
  };
};

export const fdpgEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: EmailParameterMap,
): ITemplateEmail => {
  return {
    to: validContacts,
    categories,
    templateId: 58,
    params: {
      projectAbbreviation: proposal.projectAbbreviation,
      projectLink: projectLink,
      conditionProposalRejected: !!emailParameterMap['conditionProposalRejected'],
      conditionProposalFdpgCheck: !!emailParameterMap['conditionProposalFdpgCheck'],
      conditionFdpgCheckReminderForFdpg: !!emailParameterMap['conditionFdpgCheckReminderForFdpg'],
      conditionProposalUacCheck: !!emailParameterMap['conditionProposalUacCheck'],
      conditionProposalLocationCheck: !!emailParameterMap['conditionProposalLocationCheck'],
      conditionProposalContracting: !!emailParameterMap['conditionProposalContracting'],
      conditionProposalDataDelivery: !!emailParameterMap['conditionProposalDataDelivery'],
      conditionProposalDataReady: !!emailParameterMap['conditionProposalDataReady'],
      conditionProposalDataResearch: !!emailParameterMap['conditionProposalDataResearch'],
      conditionProposalFinished: !!emailParameterMap['conditionProposalFinished'],
      conditionProposalReport: !!emailParameterMap['conditionProposalReport'],
      conditionProposalPublication: !!emailParameterMap['conditionProposalPublication'],
      conditionProposalRegistration: !!emailParameterMap['conditionProposalRegistration'],
      conditionProposalConcluded: !!emailParameterMap['conditionProposalConcluded'],
      conditionProposalArchived: !!emailParameterMap['conditionProposalArchived'],
      conditionProposalReportCreate: !!emailParameterMap['conditionProposalReportCreate'],
      conditionProposalPublicationCreate: !!emailParameterMap['conditionProposalPublicationCreate'],
      conditionProposalPublicationUpdate: !!emailParameterMap['conditionProposalPublicationUpdate'],
      conditionProposalContractSignedUser: !!emailParameterMap['conditionProposalContractSignedUser'],
      conditionProposalContractSignedLocations: !!emailParameterMap['conditionProposalContractSignedLocations'],
      conditionProposalDataReturn: !!emailParameterMap['conditionProposalDataReturn'],
      conditionProposalRegistrationCreate: !!emailParameterMap['conditionProposalRegistrationCreate'],
    },
  };
};

export const dizEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: EmailParameterMap,
): ITemplateEmail => {
  const timestamp = !!emailParameterMap['timestamp']
    ? getLocaleDateString(emailParameterMap['timestamp'] as Date)
    : undefined;

  return {
    to: validContacts,
    categories,
    templateId: 59,
    params: {
      projectAbbreviation: proposal.projectAbbreviation,
      projectLink: projectLink,
      timestamp,
      conditionProposalRejected: !!emailParameterMap['conditionProposalRejected'],
      conditionProposalLocationCheck: !!emailParameterMap['conditionProposalLocationCheck'],
      conditionProposalLocalUacCheck: !!emailParameterMap['conditionProposalLocalUacCheck'],
      conditionProposalUacReminder: !!emailParameterMap['conditionProposalUacReminder'],
      conditionProposalContractSignedUser: !!emailParameterMap['conditionProposalContractSignedUser'],
      conditionProposalDataDelivery: !!emailParameterMap['conditionProposalDataDelivery'],
      conditionProposalDataReady: !!emailParameterMap['conditionProposalDataReady'],
      conditionProposalDataResearch: !!emailParameterMap['conditionProposalDataResearch'],
      conditionProposalFinished: !!emailParameterMap['conditionProposalFinished'],
      conditionProposalReport: !!emailParameterMap['conditionProposalReport'],
      conditionProposalPublication: !!emailParameterMap['conditionProposalPublication'],
      conditionProposalConcluded: !!emailParameterMap['conditionProposalConcluded'],
      conditionProposalArchived: !!emailParameterMap['conditionProposalArchived'],
      DUE_DAYS_LOCATION_CHECK: emailParameterMap['DUE_DAYS_LOCATION_CHECK'] as string,
      DUE_DAYS_LOCATION_CONTRACTING: emailParameterMap['DUE_DAYS_LOCATION_CONTRACTING'] as string,
      DUE_DAYS_EXPECT_DATA_DELIVERY: emailParameterMap['DUE_DAYS_EXPECT_DATA_DELIVERY'] as string,
    },
  };
};

export const uacEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: EmailParameterMap,
): ITemplateEmail => {
  const timestamp = getLocaleDateString(proposal.dueDateForStatus);

  return {
    to: validContacts,
    categories,
    templateId: 60,
    params: {
      projectAbbreviation: proposal.projectAbbreviation,
      projectLink: projectLink,
      timestamp,
      conditionProposalLocationCheckDizForward: !!emailParameterMap['conditionProposalLocationCheckDizForward'],
      conditionProposalUacReminder: !!emailParameterMap['conditionProposalUacReminder'],
      DUE_DAYS_LOCATION_CHECK: emailParameterMap['DUE_DAYS_LOCATION_CHECK'] as string,
      DUE_DAYS_LOCATION_CONTRACTING: emailParameterMap['DUE_DAYS_LOCATION_CONTRACTING'] as string,
      DUE_DAYS_EXPECT_DATA_DELIVERY: emailParameterMap['DUE_DAYS_EXPECT_DATA_DELIVERY'] as string,
    },
  };
};
