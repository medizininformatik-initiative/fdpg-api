import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';

export const buildParticipatingEmailSummary = (
  validContacts: string[],
  changes: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.ParticipatingScientistSummary],
  subject: 'Zusammenfassung der Änderungen des Projektes',
  text: [
    `Es erfolgten Änderungen am Projekt "${proposal.projectAbbreviation}" mit Ihrer Beteiligung:`,
    `\n\n`,
    ...changes.map((change) => `\t- ${change}\n`),
    `\n\n`,
    proposalUrl,
  ].reduce((acc, cur) => acc + cur, ''),
});
