import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Comment } from 'src/modules/comment/schema/comment.schema';

export const getProposalMessageCreationEmailForOwner = (
  validContacts: string[],
  _proposal: Proposal,
  _comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Neuer Kommentar',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nim Forschungsdatenportal ist eine neue Nachricht für Sie eingegangen. Bitte bearbeiten Sie diese zeitnah unter:\n\n ${proposalUrl}`,
});

export const getProposalMessageCreationEmailForFdpg = (
  validContacts: string[],
  _proposal: Proposal,
  _comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Neuer Kommentar',
  text: `Liebes FDPG Team,\n\nim Forschungsdatenportal ist eine neue Nachricht für Sie eingegangen. Bitte bearbeiten Sie diese zeitnah unter:\n\n ${proposalUrl}`,
});

export const getProposalMessageCreationEmailForDiz = (
  validContacts: string[],
  _proposal: Proposal,
  _comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Neuer Kommentar',
  text: `Liebe DIZ-Mitarbeiterin, lieber DIZ-Mitarbeiter,\n\nim Forschungsdatenportal ist eine neue Nachricht für Sie eingegangen. Bitte bearbeiten Sie diese zeitnah unter:\n\n ${proposalUrl}`,
});

export const getProposalMessageCreationEmailForUac = (
  validContacts: string[],
  _proposal: Proposal,
  _comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Neuer Kommentar',
  text: `Liebes Use & Access Comittee,\n\nim Forschungsdatenportal ist eine neue Nachricht für Sie eingegangen. Bitte bearbeiten Sie diese zeitnah unter:\n\n ${proposalUrl}`,
});
