import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { getLocaleDateString } from 'src/shared/utils/date.utils';
import { ProposalWithoutContent } from '../event-engine/types/proposal-without-content.type';
import { HistoryEventType } from '../proposal/enums/history-event.enum';
import { TemplateProposalEmailConditionKeys } from './types/template-email-param-keys.types';

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
    projectResearchers: [proposal.ownerName],
    conditionProposalRejected: changes.includes(HistoryEventType.ProposalRejected),
    conditionProposalRework: !!changes[HistoryEventType.ProposalRework],
    conditionProposalFdpgCheck: changes.includes(HistoryEventType.ProposalFdpgCheck),
    conditionProposalLocationCheck: changes.includes(HistoryEventType.ProposalLocationCheck),
    conditionProposalContracting: changes.includes(HistoryEventType.ProposalContracting),
    conditionProposalDataDelivery: changes.includes(HistoryEventType.ProposalDataDelivery),
    conditionProposalDataResearch: changes.includes(HistoryEventType.ProposalDataResearch),
    conditionProposalFinished: changes.includes(HistoryEventType.ProposalFinished),
    conditionProposalConcluded: false, // changes.includes(HistoryEventType.Concluded),
    conditionProposalArchived: !!changes.includes(HistoryEventType.ProposalArchived),
  },
});

export const researcherEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: Partial<Record<TemplateProposalEmailConditionKeys, boolean>>,
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
    },
  };
};

export const fdpgEmail = (
  validContacts: string[],
  proposal: Proposal,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: Partial<Record<TemplateProposalEmailConditionKeys, boolean>>,
): ITemplateEmail => {
  return {
    to: validContacts,
    categories,
    templateId: 58,
    params: {
      projectAbbreviation: proposal.projectAbbreviation,
      projectLink: projectLink,
      firstName: 'firstName',
      lastName: 'lastName',
      conditionProposalRejected: !!emailParameterMap['conditionProposalRejected'],
      conditionProposalFdpgCheck: !!emailParameterMap['conditionProposalFdpgCheck'],
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

      conditionProposalContractSignedUser: !!emailParameterMap['conditionProposalContractSignedUser'],
      conditionProposalContractSignedLocations: !!emailParameterMap['conditionProposalContractSignedLocations'],
      conditionProposalDataReturn: !!emailParameterMap['conditionProposalDataReturn'],
    },
  };
};

export const dizEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: Partial<Record<TemplateProposalEmailConditionKeys, boolean>>,
): ITemplateEmail => {
  const timestamp = getLocaleDateString(proposal.dueDateForStatus);

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
    },
  };
};

export const uacEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: Partial<Record<TemplateProposalEmailConditionKeys, boolean>>,
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
    },
  };
};
