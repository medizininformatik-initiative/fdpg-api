import { ForbiddenException } from '@nestjs/common';
import { isNotEmptyObject } from 'class-validator';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { SignContractDto } from '../dto/sign-contract.dto';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';

export const validateContractSign = (
  proposal: Proposal,
  user: IRequestUser,
  vote: SignContractDto,
  file?: Express.Multer.File,
) => {
  if (vote.value === true) {
    const hasContractAttached = file?.buffer;
    if (!hasContractAttached) {
      const errorInfo = new ValidationErrorInfo({
        constraint: 'hasContract',
        message: 'No Contract attached',
        property: 'file',
        code: BadRequestError.ContractSignNoContract,
      });
      throw new ValidationException([errorInfo]);
    }
  }

  if (proposal.status !== ProposalStatus.Contracting) {
    throw new ForbiddenException('The current status does not allow to sign contracts');
  }

  if (user.singleKnownRole === Role.Researcher) {
    validateForResearcher(proposal);
  } else if (user.singleKnownRole === Role.DizMember) {
    validateForLocation(proposal, user);
  } else {
    // Just in case
    throw new ForbiddenException();
  }
};

const validateForResearcher = (proposal: Proposal) => {
  const hasResearcherDecision = proposal.contractRejectedByResearcher || proposal.contractAcceptedByResearcher;
  if (hasResearcherDecision) {
    throw new ForbiddenException('The researcher contract is already signed');
  }
};

const validateForLocation = (proposal: Proposal, user: IRequestUser) => {
  const hasResearcherDecision = proposal.contractRejectedByResearcher || proposal.contractAcceptedByResearcher;
  if (!hasResearcherDecision) {
    throw new ForbiddenException('The researcher has not signed the contract yet');
  }

  const isUacApprovedLocation = proposal.uacApprovedLocations.find((location) => location === user.miiLocation);
  const isSignedLocation = proposal.signedContracts.find((location) => location === user.miiLocation);

  if (!isUacApprovedLocation || isSignedLocation) {
    throw new ForbiddenException(
      'The contract could not be signed. The location might be not valid to sign or already did',
    );
  }
};
