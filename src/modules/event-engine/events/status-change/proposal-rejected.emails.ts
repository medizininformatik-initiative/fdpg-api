import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const getProposalRejectEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag abgelehnt',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nIhr Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde aus formalen Gründen abgelehnt. Mehr Informationen finden Sie auf Ihrer Antragsseite im Forschungsdatenportal.\n\n ${proposalUrl}`,
});

export const getProposalRejectEmailForParticipants = (
  validContacts: string[],
  proposal: Proposal,
  _proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag abgelehnt',
  text: `Liebe Forschende,\n\nDer Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" (eingereicht von ${proposal.ownerName}) wurde aus formalen Gründen abgelehnt.`,
});
