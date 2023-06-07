import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Comment } from 'src/modules/comment/schema/comment.schema';

export const getProposalTaskCompletionEmailForFdpg = (
  validContacts: string[],
  proposal: Proposal,
  comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Aufgabe wurde bearbeitet',
  text: `Liebes FDPG Team,\n\nfür das Projekt "${proposal.projectAbbreviation}" wurde eine Aufgabe als bearbeitet markiert:\n\n "${comment.content}"\n\n${proposalUrl}`,
});

export const getProposalTaskCompletionEmailForDiz = (
  validContacts: string[],
  proposal: Proposal,
  comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Aufgabe wurde bearbeitet',
  text: `Für das Projekt "${proposal.projectAbbreviation}" wurde eine Aufgabe als bearbeitet markiert: \n\n ${comment.content}`,
});

export const getProposalTaskCompletionEmailForUac = (
  validContacts: string[],
  proposal: Proposal,
  comment: Comment,
  proposalUrl: string,
): IEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  subject: 'Aufgabe wurde bearbeitet',
  text: `Für das Projekt "${proposal.projectAbbreviation}" wurde eine Aufgabe als bearbeitet markiert: \n\n ${comment.content}`,
});
