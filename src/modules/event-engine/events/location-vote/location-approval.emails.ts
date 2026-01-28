import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { getLocaleDateString } from 'src/shared/utils/date.utils';

export const getDizApprovalEmailForUacMembers = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => {
  const dueDateString = getLocaleDateString(proposal.dueDateForStatus);
  const locationCheckDateString = getLocaleDateString(proposal.statusChangeToLocationCheckAt);

  return {
    to: validContacts,
    categories: [EmailCategory.LocationVote],
    subject: 'Projektantrag an Standort geleitet',
    text: `Liebes Use & Access Comittee,\n\nein Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde am ${locationCheckDateString} eingereicht und nun von Ihrem DIZ zur Bearbeitung durch Ihr UAC freigegeben. Bitte prüfen Sie den Antrag und tragen Sie im Anschluss Ihr Votum auf der Antragsseite des Forschungsdatenportals ein.\n\nDie Frist zur Rückmeldung an das FDPG endet am ${dueDateString}.\n\n${proposalUrl}`,
  };
};

export const getUacApprovalEmailForDizConditionCheck = (validContacts: string[], proposal: Proposal): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.LocationVote],
    subject: 'UAC-Votum ist eingegangen',
    text: `Liebe Mitarbeitende in den Transferstellen,\n\nIhr UAC hat über den Projektantrag mit der ID "${proposal.projectAbbreviation}" entschieden. Bitte geben Sie die Antwort Ihres Standortes an das FDPG weiter.`,
  };
};

export const getVotingCompleteEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.LocationVote],
    subject: 'Projektantrag an Standort geleitet',
    text: `Liebes FDPG Team,\n\nalle angefragten Use & Access Comittees haben über den Antrag "${proposal.projectAbbreviation}" entschieden. Bitte prüfen Sie den Antrag auf der Antragsseite des Forschungsdatenportals und leiten Sie den Vertragsschluss ein.\n\n ${proposalUrl}`,
  };
};
