import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';

export const getPublicationsReminderEmailForOwner = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\ndie Frist zur Bereitstellung von Zwischen- und Ergebnisberichten für das Projekt mit der ID "${proposal.projectAbbreviation}" endet in einem Monat.\n\nBitte bearbeiten Sie den Vorgang bis zum Ende der Projektlaufzeit.\n\n ${proposalUrl}`,
});
