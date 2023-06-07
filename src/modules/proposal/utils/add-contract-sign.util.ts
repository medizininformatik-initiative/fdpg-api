import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getOwner } from 'src/shared/utils/get-owner.util';
import { SignContractDto } from '../dto/sign-contract.dto';
import { DeclineType } from '../enums/decline-type.enum';
import { FdpgTaskType } from '../enums/fdpg-task-type.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';
import { addFdpgTaskAndReturnId } from './add-fdpg-task.util';
import { setDueDate } from './due-date.util';
import { clearLocationsVotes } from './location-flow.util';

export const addContractSign = (proposal: Proposal, vote: SignContractDto, user: IRequestUser) => {
  if (user.singleKnownRole === Role.Researcher) {
    addContractSignForResearcher(proposal, vote, user);
  } else if (user.singleKnownRole === Role.DizMember) {
    addContractSignForLocation(proposal, user.miiLocation, vote, user);
  }
};

const addContractSignForResearcher = (proposal: Proposal, vote: SignContractDto, _user: IRequestUser) => {
  proposal.researcherSignedAt = new Date();
  if (vote.value === true) {
    setDueDate(proposal, true);
    proposal.statusChangeToLocationContractingAt = new Date();
    proposal.contractRejectedByResearcher = false;
    proposal.contractAcceptedByResearcher = true;
  } else {
    proposal.contractRejectedByResearcher = true;
    proposal.contractAcceptedByResearcher = false;
    proposal.status = ProposalStatus.Rejected;
    proposal.contractRejectedByResearcherReason = vote.declineReason;
  }
};

const addContractSignForLocation = (
  proposal: Proposal,
  location: MiiLocation,
  vote: SignContractDto,
  user: IRequestUser,
) => {
  const uacApproval =
    proposal.uacApprovals.find((vote) => vote.location === location) ||
    proposal.conditionalApprovals.find((vote) => vote.location === location);

  uacApproval.signedAt = new Date();
  uacApproval.signedByOwnerId = user.userId;

  clearLocationsVotes(proposal, location);

  if (vote.value === true) {
    proposal.signedContracts.push(location);
    uacApproval.isContractSigned = true;
    proposal.totalContractedDataAmount = (proposal.totalContractedDataAmount ?? 0) + (uacApproval.dataAmount ?? 0);
  } else {
    proposal.requestedButExcludedLocations.push(location);
    proposal.declineReasons = [
      ...proposal.declineReasons,
      {
        location: user.miiLocation,
        reason: vote.declineReason,
        type: DeclineType.LocationSign,
        owner: getOwner(user),
        createdAt: new Date(),
      },
    ];
  }

  proposal.isContractingComplete = proposal.uacApprovedLocations.length === 0;
  if (proposal.isContractingComplete) {
    addFdpgTaskAndReturnId(proposal, FdpgTaskType.ContractComplete);
  }
};
