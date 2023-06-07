import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const getProposalContractingEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag zum Vertragsabschluss bereit',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nIhr Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde zum Vertragsabschluss freigegeben. Bitte gehen Sie dazu auf die Antragsseite des Forschungsdatenportals. Dort können Sie den vorbereiteten Vertrag abrufen. Bitte überprüfen Sie diesen vor der Unterschrift. Laden Sie im Anschluss eine Kopie des unterschriebenen Vertrages im Forschungsdatenportal hoch.\n\n${proposalUrl}`,
});
