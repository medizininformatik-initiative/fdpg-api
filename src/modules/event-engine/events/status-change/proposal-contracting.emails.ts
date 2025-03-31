import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';

const getProposalContractingEmailForOwnerHeader = `Liebe Antragstellerin, lieber Antragsteller,`;

export const getProposalContractingEmailForOwnerBody = (proposal: ProposalWithoutContent) =>
  `Ihr Projektantrag mit dem Projektkürzel "${proposal.projectAbbreviation}" wurde zum Vertragsabschluss freigegeben. Bitte gehen Sie dazu auf die Antragsseite des Forschungsdatenportals. Dort können Sie den vorbereiteten Vertrag abrufen. Bitte überprüfen Sie diesen vor der Unterschrift. Laden Sie im Anschluss eine Kopie des unterschriebenen Vertrages im Forschungsdatenportal hoch.`;

const getProposalContractingEmailForOwnerFooter = (proposalUrl) => proposalUrl;

export const getProposalContractingEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.StatusChange],
  subject: 'Projektantrag zum Vertragsabschluss bereit',
  text: [
    getProposalContractingEmailForOwnerHeader,
    `\n\n`,
    getProposalContractingEmailForOwnerBody(proposal),
    `\n\n`,
    getProposalContractingEmailForOwnerFooter(proposalUrl),
  ].reduce((acc, cur) => acc + cur, ''),
});
