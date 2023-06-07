import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const getProposalLockedEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.ProposalLock],
  subject: 'Projektantrag gesperrt',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nIhr Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde durch das Forschungsdatenportal temporär gesperrt. Über den Fortschritt des Antragsprozesses können Sie sich auf Ihrer Antragsseite im Forschungsdatenportal informieren.\n\n${proposalUrl}`,
});

export const getProposalUnlockedEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.ProposalLock],
  subject: 'Projektantrag gesperrt',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nIhr Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde durch das Forschungsdatenportal wieder entsperrt. Über den Fortschritt des Antragsprozesses können Sie sich auf Ihrer Antragsseite im Forschungsdatenportal informieren.\n\n${proposalUrl}`,
});
