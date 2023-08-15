import { MiiLocation } from 'src/shared/constants/mii-locations';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getOwner } from 'src/shared/utils/get-owner.util';
import { DeclineType } from '../enums/decline-type.enum';
import { Proposal } from '../schema/proposal.schema';
import { ConditionalApproval } from '../schema/sub-schema/conditional-approval.schema';
import { UacApproval } from '../schema/sub-schema/uac-approval.schema';
import { addHistoryItemForUnselectedLocation } from './proposal-history.util';

export const excludeUnselectedLocations = (
  proposal: Proposal,
  user: IRequestUser,
  approval: UacApproval | ConditionalApproval,
) => {
  // Excluding in flow:
  proposal.requestedButExcludedLocations.push(approval.location);

  // Just to be sure:
  approval.isContractSigned = false;

  proposal.totalPromisedDataAmount = proposal.totalPromisedDataAmount - approval.dataAmount;
  addHistoryItemForUnselectedLocation(proposal, user, approval.location);
  addRejectionReasonForUnselectedLocation(proposal, user, approval.location);
};

export const addRejectionReasonForUnselectedLocation = (
  proposal: Proposal,
  user: IRequestUser,
  unselectedLocation: MiiLocation,
) => {
  proposal.declineReasons = [
    ...proposal.declineReasons,
    {
      location: unselectedLocation,
      reason: undefined,
      type: DeclineType.FdpgUnselected,
      owner: getOwner(user),
      createdAt: new Date(),
    },
  ];
};
