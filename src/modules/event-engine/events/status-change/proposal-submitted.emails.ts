import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const getProposalSubmitEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  _proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag eingereicht',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nder Projektantrag "${proposal.projectAbbreviation}" wurde durch Sie erfolgreich eingereicht. Nach erfolgter Prüfung des Antrags informieren wir Sie in Kürze über die nächsten Schritte.`,
});

export const getProposalSubmitEmailForFdpg = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag eingereicht',
  text: `Liebes FDPG Team,\n\nder Projektantrag "${proposal.projectAbbreviation}" wurde durch ${proposal.ownerName} erfolgreich eingereicht. Bitte prüfen Sie den Antrag auf der Antragsseite des Forschungsdatenportals formell.\n\n ${proposalUrl}`,
});
