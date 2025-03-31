import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { getLocaleDateString } from 'src/shared/utils/date.utils';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';

export const getProposalLocationCheckEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag an Standorte geleitet',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nIhr Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde an die von Ihnen ausgewählten Standorte weitergeleitet. Ihr Antrag wird nun von den lokalen Use & Access Comittees der Standorte geprüft. Dies kann bis zu acht Wochen dauern. Über den Fortschritt des Antragsprozesses können Sie sich auf Ihrer Antragsseite im Forschungsdatenportal informieren.\n\n${proposalUrl}`,
});

export const getProposalLocationCheckEmailForParticipantsBody = (proposal: ProposalWithoutContent) =>
  `Das Projekt "${proposal.projectAbbreviation}" mit Ihrer Beteiligung wurde durch einen FDPG-Mitarbeiter bearbeitet und an die gewünschten Standorte weitergeleitet.`;

export const getProposalLocationCheckEmailForDizMembers = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => {
  const dueDateString = getLocaleDateString(proposal.dueDateForStatus);
  return {
    to: validContacts,
    categories: [EmailCategory.StatusChange],
    subject: 'Projektantrag an Standort geleitet',
    text: `Liebe DIZ-Mitarbeiterin, lieber DIZ-Mitarbeiter,\n\nein Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde über das FDPG bei Ihnen eingereicht. Bitte lassen Sie den Antrag von Ihrem lokalen Use & Access Comittee innerhalb von 4-8 Wochen prüfen.\n\nDie Frist zur Rückmeldung an das FDPG endet am ${dueDateString}.\n\nBitte lösen Sie schnellstmöglich die Weiterleitung des Antrags innerhalb des FDPGs an das UAC Ihres Standortes aus.\n\n${proposalUrl}`,
  };
};
