import { Comment } from 'src/modules/comment/schema/comment.schema';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';

export const getProposalMessageCreationEmailForOwner = (
  validContacts: string[],
  proposal: Proposal,
  comment: Comment,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: 22,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: comment.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});

export const getProposalMessageCreationEmailForFdpg = (
  validContacts: string[],
  proposal: Proposal,
  comment: Comment,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: comment.owner?.role === Role.Researcher ? 23 : 24,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: comment.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});

export const getProposalMessageCreationEmailForDiz = (
  validContacts: string[],
  proposal: Proposal,
  comment: Comment,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: 25,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: comment.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});

export const getProposalMessageCreationEmailForUac = (
  validContacts: string[],
  proposal: Proposal,
  comment: Comment,
  proposalUrl: string,
): ITemplateEmail => ({
  to: validContacts,
  categories: [EmailCategory.CommentTask],
  templateId: 25,
  params: {
    projectAbbreviation: proposal.projectAbbreviation,
    timestamp: comment.createdAt.toISOString(),
    projectLink: proposalUrl,
  },
});
