import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';

export const getProposalFdpgCheckReminderEmailForFdpg = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebes FDPG Team,\n\ndie Frist zur Prüfung des Projekts mit der ID "${proposal.projectAbbreviation}" endet heute.\n\nBitte bearbeiten Sie den Vorgang schnellstmöglich.\n\n ${proposalUrl}`,
});
