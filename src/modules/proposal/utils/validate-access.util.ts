import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { LocationState } from '../enums/location-state.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ProposalDocument } from '../schema/proposal.schema';

export const validateProposalAccess = (proposal: ProposalDocument, user: IRequestUser, willBeModified?: boolean) => {
  if (willBeModified && proposal.isLocked) {
    throwForbiddenError('Proposal is currently locked to modifications');
  }

  if (user.roles.includes(Role.Researcher)) {
    checkAccessForResearcher(proposal, user);
  }

  if (user.roles.includes(Role.FdpgMember)) {
    checkAccessForFdpgMember(proposal);
  }

  if (user.roles.includes(Role.DizMember)) {
    checkAccessForDizMember(proposal, user);
  }

  if (user.roles.includes(Role.UacMember)) {
    checkAccessForUacMember(proposal, user);
  }
};

const checkAccessForResearcher = (proposal: ProposalDocument, user: IRequestUser) => {
  const isOwner = proposal.owner.id === user.userId;
  if (!isOwner) {
    throwForbiddenError(`Proposal has a different owner than this researcher`);
  }
};
const checkAccessForFdpgMember = (proposal: ProposalDocument) => {
  if (proposal.status === ProposalStatus.Draft) {
    throwForbiddenError(`Proposal is still in status ${ProposalStatus.Draft}`);
  }
};

type ProposalPick = Pick<
  ProposalDocument,
  | 'openDizChecks'
  | 'dizApprovedLocations'
  | 'uacApprovedLocations'
  | 'conditionalApprovals'
  | 'signedContracts'
  | 'requestedButExcludedLocations'
  | 'contractAcceptedByResearcher'
  | 'contractRejectedByResearcher'
  | 'status'
>;

type UserPick = Pick<IRequestUser, 'miiLocation'>;
export const getLocationState = (proposal: ProposalPick, user: UserPick) => {
  const conditionalApproval = proposal.conditionalApprovals?.find((approval) => approval.location === user.miiLocation);
  const signedContract = proposal.signedContracts?.includes(user.miiLocation);
  return {
    isDizCheck: proposal.openDizChecks?.includes(user.miiLocation),
    dizApproved: proposal.dizApprovedLocations?.includes(user.miiLocation),
    uacApproved: proposal.uacApprovedLocations?.includes(user.miiLocation),
    isConditionalApproval: !!conditionalApproval,
    conditionalApprovalAccepted: conditionalApproval?.isAccepted ?? false,
    conditionalApprovalDeclined:
      (conditionalApproval?.reviewedAt !== undefined && !conditionalApproval?.isAccepted) ?? false,
    contractAcceptedByResearcher: proposal.contractAcceptedByResearcher,
    contractRejectedByResearcher: proposal.contractRejectedByResearcher,
    signedContract,
    signedContractAndContractingDone: signedContract && proposal.status !== ProposalStatus.Contracting,
    requestedButExcluded: proposal.requestedButExcludedLocations?.includes(user.miiLocation),
  };
};

export const getMostAdvancedState = (proposal: ProposalPick, user: UserPick): LocationState => {
  const {
    isDizCheck,
    dizApproved,
    uacApproved,
    signedContract,
    signedContractAndContractingDone,
    requestedButExcluded,
    isConditionalApproval,
    conditionalApprovalAccepted,
    conditionalApprovalDeclined,
    contractAcceptedByResearcher,
    contractRejectedByResearcher,
  } = getLocationState(proposal, user);

  if (conditionalApprovalDeclined) {
    return LocationState.ConditionalApprovalDeclined;
  } else if (contractRejectedByResearcher) {
    return LocationState.ResearcherRejectedContract;
  } else if (requestedButExcluded) {
    return LocationState.RequestedButExcluded;
  } else if (signedContractAndContractingDone) {
    return LocationState.SignedContractAndContractingDone;
  } else if (signedContract) {
    return LocationState.SignedContract;
  } else if (contractAcceptedByResearcher) {
    return LocationState.ResearcherAcceptedContract;
  } else if (conditionalApprovalAccepted) {
    return LocationState.ConditionalApprovalAccepted;
  } else if (isConditionalApproval) {
    return LocationState.ConditionalApprovalPending;
  } else if (uacApproved) {
    return LocationState.UacApproved;
  } else if (dizApproved) {
    return LocationState.DizApproved;
  } else if (isDizCheck) {
    return LocationState.IsDizCheck;
  } else {
    return LocationState.NotRequested;
  }
};

export const checkAccessForDizMember = (proposal: ProposalDocument, user: UserPick) => {
  if (proposal.status === ProposalStatus.Draft) {
    throwForbiddenError(`Proposal is still in status ${ProposalStatus.Draft}`);
  }

  const locationState = getLocationState(proposal, user);

  if (
    !locationState.isDizCheck &&
    !locationState.dizApproved &&
    !locationState.uacApproved &&
    !locationState.signedContract &&
    !locationState.requestedButExcluded
  ) {
    throwForbiddenError('Location is not assigned to this proposal');
  }
};

export const checkAccessForUacMember = (proposal: ProposalDocument, user: UserPick) => {
  if (proposal.status === ProposalStatus.Draft) {
    throwForbiddenError(`Proposal is still in status ${ProposalStatus.Draft}`);
  }

  const locationState = getLocationState(proposal, user);

  if (
    !locationState.dizApproved &&
    !locationState.uacApproved &&
    !locationState.signedContract &&
    !locationState.requestedButExcluded
  ) {
    throwForbiddenError('Location is not assigned to this proposal or DIZ did not accept yet');
  }
};

const throwForbiddenError = (message?: string) => {
  throw new ForbiddenException(message);
};
