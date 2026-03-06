import { IRequestUser } from 'src/shared/types/request-user.interface';
import { FdpgTaskType } from '../enums/fdpg-task-type.enum';
import { Proposal } from '../schema/proposal.schema';
import { addFdpgTaskAndReturnId } from './add-fdpg-task.util';
import { clearLocationsVotes } from './location-flow.util';

export const addContractSkip = (proposal: Proposal, locations: string[], user: IRequestUser) => {
  locations.forEach((location) => addContractSkipForLocation(proposal, location, user));

  // skip researcher sign
  proposal.statusChangeToLocationContractingAt = new Date();
  proposal.contractRejectedByResearcher = false;
  proposal.contractAcceptedByResearcher = true;
  proposal.contractingSkipped = true;
};

const addContractSkipForLocation = (proposal: Proposal, location: string, user: IRequestUser) => {
  const uacApproval =
    proposal.uacApprovals.find((vote) => vote.location === location) ||
    proposal.conditionalApprovals.find((vote) => vote.location === location);

  uacApproval.signedAt = new Date();
  uacApproval.signedByOwnerId = user.userId;

  clearLocationsVotes(proposal, location);

  proposal.signedContracts.push(location);
  uacApproval.isContractSigned = true;
  proposal.totalContractedDataAmount = (proposal.totalContractedDataAmount ?? 0) + (uacApproval.dataAmount ?? 0);
  proposal.uacApprovals = [...proposal.uacApprovals, uacApproval];

  proposal.isContractingComplete = proposal.uacApprovedLocations.length === 0;
  if (proposal.isContractingComplete) {
    addFdpgTaskAndReturnId(proposal, FdpgTaskType.ContractComplete);
  }
};
