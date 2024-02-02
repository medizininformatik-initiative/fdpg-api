import { Answer } from 'src/modules/comment/schema/answer.schema';
import { Comment } from 'src/modules/comment/schema/comment.schema';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';

export const getProposalMessageAnswerCreationEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  _comment: Comment,
  answer: Answer,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: 22,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: answer.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});

export const getProposalMessageAnswerCreationEmailForFdpg = (
  validContacts: string[],
  proposal: Proposal,
  _comment: Comment,
  answer: Answer,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: answer.owner?.role === Role.Researcher ? 23 : 24,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: answer.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});

export const getProposalMessageAnswerCreationEmailForDiz = (
  validContacts: string[],
  proposal: Proposal,
  _comment: Comment,
  answer: Answer,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: 25,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: answer.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});

export const getProposalMessageAnswerCreationEmailForUac = (
  validContacts: string[],
  proposal: Proposal,
  _comment: Comment,
  answer: Answer,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: 25,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: answer.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});
