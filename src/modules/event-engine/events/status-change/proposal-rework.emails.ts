import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const getProposalReworkEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag überarbeiten',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nIhr Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" ist vom FDPG Team zur Überarbeitung zurückgewiesen worden. Im Forschungsdatenportal können Sie diese Aufgaben einsehen. Bitte bearbeiten Sie diese zeitnah unter: \n\n ${proposalUrl}`,
});
