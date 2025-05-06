import { ForbiddenException } from '@nestjs/common';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { Role } from 'src/shared/enums/role.enum';

export const validateDizApproval = (proposal: Proposal, user: IRequestUser) => {
  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('The current status does not allow to set the diz approval');
  }

  const canUpdateCondition =
    proposal.conditionalApprovals
      .filter((approval) => approval.location === user.miiLocation)
      .filter((approval) => !(approval.isAccepted && approval.reviewedAt)).length > 0 ||
    proposal.uacApprovals.filter((approval) => approval.location === user.miiLocation).length > 0;

  if (!proposal.openDizChecks.includes(user.miiLocation) && !canUpdateCondition) {
    throw new ForbiddenException('The location is not allowed to provide a vote. It might have already voted');
  }
};

export const validateDizConditionApproval = (proposal: Proposal, user: IRequestUser) => {
  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('The current status does not allow to set the diz approval');
  }

  const canUpdateCondition =
    proposal.conditionalApprovals
      .filter((approval) => approval.location === user.miiLocation)
      .filter((approval) => !(approval.isAccepted && approval.reviewedAt)).length > 0 ||
    proposal.uacApprovals.filter((approval) => approval.location === user.miiLocation).length > 0;

  if (!proposal.openDizConditionChecks.includes(user.miiLocation) && !canUpdateCondition) {
    throw new ForbiddenException('The location is not allowed to provide a vote. It might have already voted');
  }
};

export const validateUacApproval = (proposal: Proposal, user: IRequestUser) => {
  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('The current status does not allow to set the uac approval');
  }

  if (!proposal.dizApprovedLocations.includes(user.miiLocation)) {
    throw new ForbiddenException('The location is not allowed to provide a vote. It might have already voted');
  }
};

export const validateRevertLocationVote = (proposal: Proposal, location: MiiLocation, user: IRequestUser) => {
  const isOpenDizCheck = proposal.openDizChecks.includes(location);

  if (isOpenDizCheck) {
    const errorInfo = new ValidationErrorInfo({
      constraint: 'validRevert',
      message: `The location ${location} has not voted yet`,
      property: `location`,
      code: BadRequestError.LocationRevertValidation,
    });
    throw new ValidationException([errorInfo]);
  }

  if (user.singleKnownRole !== Role.FdpgMember) {
    throw new ForbiddenException('Only FDPG Members are allowed to revert a vote');
  }

  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('The current status does not allow to revert the location vote');
  }
};
