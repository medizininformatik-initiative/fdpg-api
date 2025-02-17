import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { getLocaleDateString } from 'src/shared/utils/date.utils';

export const getResearcherSignedEmailForDizMembers = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => {
  const dueDateString = getLocaleDateString(proposal.dueDateForStatus);
  const researcherSignDateString = getLocaleDateString(proposal.researcherSignedAt);

  return {
    to: validContacts,
    categories: [EmailCategory.ContractSign],
    subject: 'Projektantrag zum Vertragsabschluss bereit',
    text: `Liebe DIZ-Mitarbeiterin, lieber DIZ-Mitarbeiter,\n\nein Vertrag zum Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde am ${researcherSignDateString} vom Antragsteller unterzeichnet. Bitte leiten Sie den Vertragsabschluss für ihren Standort auf der Antragsseite des Forschungsdatenportals ein.\n\nDie Frist zur Rückmeldung an das FDPG endet am ${dueDateString}.\n\n${proposalUrl}`,
  };
};

export const getSigningCompleteEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.ContractSign],
    subject: 'Vertragsabschlüsse vollständig',
    text: `Liebes FDPG Team,\n\nalle angefragten Use & Access Comittees haben über den Vertrag zum Antrag "${proposal.projectAbbreviation}" entschieden. Bitte prüfen Sie den Antrag auf der Antragsseite des Forschungsdatenportals und leiten Sie die Datenlieferung ein.\n\n ${proposalUrl}`,
  };
};

export const getResearcherSignedEmailForFdpgMembers = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
  signUserName: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.ContractSign],
    subject: 'Vertragsschluss',
    text: `Liebes FDPG Team,\n\nDer Forschende "${signUserName}" hat den Vertrag mit dem Projektkürzel "${proposal.projectAbbreviation}" unterzeichnet.\n\n ${proposalUrl}`,
  };
};
