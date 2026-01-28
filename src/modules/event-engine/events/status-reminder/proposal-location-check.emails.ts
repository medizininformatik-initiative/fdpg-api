import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';

export const getProposalLocationCheckReminderEmail1ForDiz = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebe DIZ-Mitarbeiterin, lieber DIZ-Mitarbeiter,\n\ndie Frist zur Prüfung des Projekts mit der ID "${
    proposal.projectAbbreviation
  }" endet in zwei Wochen.\n\nBitte bearbeiten Sie den Vorgang bis spätestens ${proposal.dueDateForStatus.toLocaleDateString(
    'de',
  )}.\n\n ${proposalUrl}`,
});

export const getProposalLocationCheckReminderEmail1ForUac = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebes Use & Access Comittee,\n\ndie Frist zur Prüfung des Projekts mit der ID "${
    proposal.projectAbbreviation
  }" endet in zwei Wochen.\n\nBitte bearbeiten Sie den Vorgang bis spätestens ${proposal.dueDateForStatus.toLocaleDateString(
    'de',
  )}.\n\n ${proposalUrl}`,
});

export const getProposalLocationCheckReminderEmail2ForDiz = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebe DIZ-Mitarbeiterin, lieber DIZ-Mitarbeiter,\n\ndie Frist zur Prüfung des Projekts mit der ID "${
    proposal.projectAbbreviation
  }" endet in drei Tagen.\n\nBitte bearbeiten Sie den Vorgang bis spätestens ${proposal.dueDateForStatus.toLocaleDateString(
    'de',
  )}.\n\n ${proposalUrl}`,
});

export const getProposalLocationCheckReminderEmail2ForUac = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebes Use & Access Comittee,\n\ndie Frist zur Prüfung des Projekts mit der ID "${
    proposal.projectAbbreviation
  }" endet in drei Tagen.\n\nBitte bearbeiten Sie den Vorgang bis spätestens ${proposal.dueDateForStatus.toLocaleDateString(
    'de',
  )}.\n\n ${proposalUrl}`,
});

export const getProposalLocationCheckReminderEmail3ForDiz = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebe DIZ-Mitarbeiterin, lieber DIZ-Mitarbeiter,\n\ndie Frist zur Prüfung des Projekts mit der ID "${proposal.projectAbbreviation}" endet heute.\n\nBitte bearbeiten Sie den Vorgang schnellstmöglich.\n\n ${proposalUrl}`,
});

export const getProposalLocationCheckReminderEmail3ForUac = (
  validContacts: string[],
  proposal: ProposalWithoutContent,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusReminder],
  subject: 'Erinnerung Fristende',
  text: `Liebes Use & Access Comittee,\n\ndie Frist zur Prüfung des Projekts mit der ID "${proposal.projectAbbreviation}" endet heute.\n\nBitte bearbeiten Sie den Vorgang schnellstmöglich.\n\n ${proposalUrl}`,
});
