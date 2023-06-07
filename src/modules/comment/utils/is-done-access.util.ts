import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { CommentType } from '../enums/comment-type.enum';

/** Checks if the current user is allowed to set the isDone field
 *  Tasks: Should be possible for the assignee
 *  Comments: Should be possible for FdpgMember
 */
export const validateIsDoneAccess = (commentType: CommentType, userRole: Role): void => {
  const isCommentType =
    commentType === CommentType.ProposalMessageToLocation || commentType === CommentType.ProposalMessageToOwner;

  /** Comments */
  if (isCommentType && userRole !== Role.FdpgMember) {
    throw new ForbiddenException();
  }

  /** Tasks */
  if (commentType === CommentType.ProposalTask && userRole !== Role.Researcher) {
    throw new ForbiddenException();
  }

  if (commentType === CommentType.ProposalTaskFdpg && userRole !== Role.FdpgMember) {
    throw new ForbiddenException();
  }
};
