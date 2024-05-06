import { ForbiddenException } from '@nestjs/common';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { ValidationException } from 'src/exceptions/validation/validation.exception';

export const validateDizApproval = (proposal: Proposal, user: IRequestUser) => {
  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('The current status does not allow to set the diz approval');
  }

  if (!proposal.openDizChecks.includes(user.miiLocation)) {
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

export const validateRevertLocationVote = (proposal: Proposal, location: MiiLocation) => {
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

  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('The current status does not allow to revert the location vote');
  }
};
