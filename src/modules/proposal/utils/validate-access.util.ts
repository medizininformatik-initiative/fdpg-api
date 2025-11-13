import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { LocationState } from '../enums/location-state.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ProposalType } from '../enums/proposal-type.enum';
import { ProposalDocument } from '../schema/proposal.schema';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { Location } from 'src/modules/location/schema/location.schema';

export const validateProposalAccess = (
  proposal: ProposalDocument,
  user: IRequestUser,
  userLocation?: Location,
  willBeModified?: boolean,
) => {
  if (willBeModified && proposal.isLocked) {
    throwForbiddenError('Proposal is currently locked to modifications');
  }

  if (user.singleKnownRole === Role.FdpgMember) {
    checkAccessForFdpgMember(proposal, willBeModified);
    return;
  }

  // Special handling for register proposals when user has RegisteringMember role
  if (proposal.type === ProposalType.RegisteringForm && user.roles?.includes(Role.RegisteringMember)) {
    checkAccessForRegisteringMember(proposal, user);
    return; // Exit early for register proposals with RegisteringMember role
  }

  // Special handling for users who have RegisteringMember among their roles (not just primary role)
  if (user.roles?.includes(Role.RegisteringMember)) {
    // If user has RegisteringMember role, they should have access regardless of primary role
    return;
  }

  if (user.singleKnownRole === Role.Researcher) {
    checkAccessForResearcher(proposal, user);
  }

  if (user.singleKnownRole === Role.RegisteringMember) {
    checkAccessForRegisteringMember(proposal, user);
  }

  if (user.singleKnownRole === Role.DataSourceMember) {
    checkAccessForDataSourceMember(proposal, user, willBeModified);
  }

  if (user.singleKnownRole === Role.DizMember) {
    checkAccessForDizMember(proposal, user);
  }

  if (user.singleKnownRole === Role.UacMember) {
    checkAccessForUacMember(proposal, user);
  }

  if (user.singleKnownRole === Role.DataManagementOffice) {
    checkAccessForDmoMember(proposal, user, userLocation);
  }
};

const checkAccessForResearcher = (proposal: ProposalDocument, user: IRequestUser) => {
  const isOwner = proposal.owner.id === user.userId;
  if (!isOwner && !isParticipatingScientist(proposal, user)) {
    throwForbiddenError(
      `Proposal has a different owner than this researcher and is not in the list of participating researchers`,
    );
  }
};

const checkAccessForRegisteringMember = (proposal: ProposalDocument, user: IRequestUser) => {
  if (
    proposal.type === ProposalType.RegisteringForm &&
    proposal.registerInfo?.isInternalRegistration &&
    user.singleKnownRole === Role.FdpgMember
  ) {
    return;
  }

  const isOwner = proposal.owner.id === user.userId;
  if (!isOwner && !isParticipatingScientist(proposal, user)) {
    throwForbiddenError(
      `Proposal has a different owner than this registering member and is not in the list of participating researchers`,
    );
  }

  // ZARS-29: RegisteringMembers cannot edit Published forms
  // Only FDPG members can edit Published forms (via the sync functionality)
  if (proposal.type === ProposalType.RegisteringForm && proposal.status === ProposalStatus.Published) {
    throwForbiddenError(
      'Published registering forms can only be edited by FDPG members. Changes will be synced to the website.',
    );
  }
};

const isParticipatingScientist = (proposal: ProposalDocument, user: IRequestUser) => {
  return (
    proposal.participants.filter((participant) => participant.researcher.email === user.email).length > 0 ||
    proposal.projectResponsible?.researcher?.email === user.email
  );
};

const checkAccessForFdpgMember = (proposal: ProposalDocument, willBeModified?: boolean) => {
  // Allow modification of register proposals even in Draft status
  if (proposal.status === ProposalStatus.Draft && willBeModified && proposal.type !== ProposalType.RegisteringForm) {
    throwForbiddenError(`Proposal is still in status ${ProposalStatus.Draft}`);
  }
};

const checkAccessForDataSourceMember = (proposal: ProposalDocument, user: IRequestUser, willBeModified?: boolean) => {
  if (proposal.status === ProposalStatus.Draft && willBeModified) {
    throwForbiddenError(`Proposal is still in status ${ProposalStatus.Draft}`);
  }

  const selected = proposal.selectedDataSources ?? [PlatformIdentifier.Mii];
  const hasOverlap = user.assignedDataSources.some((ds) => selected.includes(ds));

  if (!hasOverlap) {
    throwForbiddenError(`User does not have a data source matching the proposals selected data sources`);
  }
};

const checkAccessForDmoMember = (proposal: ProposalDocument, user: IRequestUser, userLocation?: Location) => {
  if (!userLocation || !userLocation.dataManagementCenter) {
    throwForbiddenError(`User Location '${userLocation?.dataManagementCenter}' is not a DMS`);
  }

  if (proposal.dataDelivery?.dataManagementSite !== user.miiLocation) {
    throwForbiddenError('User location does not match data delivery location');
  }
};

type ProposalPick = Pick<
  ProposalDocument,
  | 'openDizChecks'
  | 'dizApprovedLocations'
  | 'openDizConditionChecks'
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
    openDizConditionChecks: proposal.openDizConditionChecks?.includes(user.miiLocation),
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
    openDizConditionChecks,
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
  } else if (openDizConditionChecks) {
    return LocationState.DizConditionCheck;
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
    !locationState.openDizConditionChecks &&
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
    !locationState.isDizCheck &&
    !locationState.openDizConditionChecks &&
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

export const validateModifyingCohortAccess = (proposal: ProposalDocument, user: IRequestUser) => {
  if (
    user.singleKnownRole === Role.FdpgMember &&
    ![ProposalStatus.Draft, ProposalStatus.Rework, ProposalStatus.FdpgCheck, ProposalStatus.LocationCheck].includes(
      proposal.status,
    )
  ) {
    throwForbiddenError('FDPG Members can modify cohorts only in Draft/Rework/FdpgCheck/LocationCheck step');
  }

  if (
    (user.singleKnownRole === Role.Researcher || user.singleKnownRole === Role.RegisteringMember) &&
    ![ProposalStatus.Draft, ProposalStatus.Rework].includes(proposal.status)
  ) {
    throwForbiddenError('Cohorts cannot be changed at this step');
  }
};
