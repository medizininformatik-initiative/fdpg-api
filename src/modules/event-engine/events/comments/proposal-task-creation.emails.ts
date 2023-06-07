import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Comment } from 'src/modules/comment/schema/comment.schema';

export const getProposalTaskCreationEmailForOwner = (
  validContacts: string[],
  _proposal: Proposal,
  _comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Neue Aufgabe eingegangen',
  text: `Liebe Antragstellerin, lieber Antragsteller,\n\nim Forschungsdatenportal ist eine neue Aufgabe für Sie eingegangen. Bitte bearbeiten Sie diese zeitnah unter:\n\n${proposalUrl}`,
});

export const getProposalTaskCreationEmailForFdpg = (
  validContacts: string[],
  _proposal: Proposal,
  _comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Neue Aufgabe eingegangen',
  text: `Liebes FDPG Team,\n\nim Forschungsdatenportal ist eine neue Aufgabe für Sie eingegangen. Bitte bearbeiten Sie diese zeitnah unter:\n\n${proposalUrl}`,
});
