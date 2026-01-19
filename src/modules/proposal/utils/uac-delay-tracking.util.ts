import { DueDateEnum } from '../enums/due-date.enum';
import { Proposal } from '../schema/proposal.schema';
import { ConditionalApproval } from '../schema/sub-schema/conditional-approval.schema';
import { DeclineReason } from '../schema/sub-schema/decline-reason.schema';
import { UacApproval } from '../schema/sub-schema/uac-approval.schema';

/**
 * Sets the delay status for any UAC-related object based on current deadline
 * @param voteObject - The vote object to update (UacApproval, ConditionalApproval, or DeclineReason)
 * @param proposal - The proposal containing current deadline information
 */
export const setUacVoteDelayStatus = (
  voteObject: UacApproval | ConditionalApproval | DeclineReason,
  proposal: Proposal,
): void => {
  const uacDeadline = proposal.deadlines?.[DueDateEnum.DUE_DAYS_LOCATION_CHECK];

  // Mark as late if vote was submitted after the end of the deadline day
  const createdAt = voteObject.createdAt ?? new Date();
  if (uacDeadline) {
    const endOfDeadlineDay = new Date(uacDeadline);
    endOfDeadlineDay.setHours(23, 59, 59, 999);

    if (createdAt > endOfDeadlineDay) {
      voteObject.isLate = true;
    } else {
      voteObject.isLate = false;
    }
  } else {
    voteObject.isLate = false;
  }
};

// Legacy functions for backwards compatibility
export const setUacApprovalDelayStatus = (approval: UacApproval, proposal: Proposal): void => {
  setUacVoteDelayStatus(approval, proposal);
};

export const setConditionalApprovalDelayStatus = (approval: ConditionalApproval, proposal: Proposal): void => {
  setUacVoteDelayStatus(approval, proposal);
};

export const setDeclineReasonDelayStatus = (declineReason: DeclineReason, proposal: Proposal): void => {
  setUacVoteDelayStatus(declineReason, proposal);
};

/**
 * Recalculates the delay status for all UAC approvals when deadline changes
 * @param proposal - The proposal containing UAC approvals and updated deadline
 */
export const recalculateAllUacDelayStatus = (proposal: Proposal): void => {
  // Update UAC approvals
  proposal.uacApprovals?.forEach((approval) => {
    setUacVoteDelayStatus(approval, proposal);
  });

  // Update conditional approvals
  proposal.conditionalApprovals?.forEach((approval) => {
    setUacVoteDelayStatus(approval, proposal);
  });

  // Update decline reasons (rejected votes)
  proposal.declineReasons?.forEach((declineReason) => {
    setUacVoteDelayStatus(declineReason, proposal);
  });
};
