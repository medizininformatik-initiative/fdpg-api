import { DeliveryAcceptance } from '../enums/data-delivery.enum';
import { DeliveryInfoStatus } from '../enums/delivery-info-status.enum';
import { ProposalStatus, ProposalSubstatus } from '../enums/proposal-status.enum';
import { IProposalGetListSchema } from '../types/proposal-get-list-schema.interface';

const getFdpgCheckSubstatus = (proposal: IProposalGetListSchema): ProposalSubstatus => {
  const { fdpgChecklist } = proposal;

  if (!fdpgChecklist) {
    console.warn(`No checklist in proposalId ${proposal._id}`);
    return ProposalSubstatus.FdpgCheckInitialView;
  }

  if (fdpgChecklist.initialViewing && fdpgChecklist.depthCheck && fdpgChecklist.ethicsCheck) {
    return ProposalSubstatus.FdpgCheckDone;
  }

  if (fdpgChecklist.depthCheck) {
    return ProposalSubstatus.FdpgCheckEthicsCheck;
  }

  if (fdpgChecklist.initialViewing) {
    return ProposalSubstatus.FdpgCheckDepthCheck;
  }

  return ProposalSubstatus.FdpgCheckInitialView;
};

const getLocationCheckSubstatus = (proposal: IProposalGetListSchema): ProposalSubstatus => {
  if (
    proposal.numberOfRequestedLocations <
    proposal.numberOfApprovedLocations + proposal.requestedButExcludedLocations.length
  ) {
    return ProposalSubstatus.LocationCheckVotingDone;
  }

  return ProposalSubstatus.LocationCheckVotingInProgress;
};

const getContractingSubstatus = (proposal: IProposalGetListSchema): ProposalSubstatus => {
  if (proposal.isContractingComplete) {
    return ProposalSubstatus.ContractingDone;
  }

  if (proposal.contractAcceptedByResearcher) {
    return ProposalSubstatus.ContractingLocationStep;
  }

  return ProposalSubstatus.ContractingResearcherStep;
};

const getExpectDataDeliverySubstatus = (proposal: IProposalGetListSchema): ProposalSubstatus => {
  const { dataDelivery } = proposal;

  if (!dataDelivery) {
    return ProposalSubstatus.ExpectDataDeliverySelectDms;
  }

  if (
    (dataDelivery.deliveryInfos || []).every(
      (deliveryInfo) =>
        deliveryInfo.status === DeliveryInfoStatus.FETCHED_BY_RESEARCHER ||
        deliveryInfo.status === DeliveryInfoStatus.RESULTS_AVAILABLE ||
        deliveryInfo.status === DeliveryInfoStatus.CANCELED,
    ) &&
    (dataDelivery.deliveryInfos || []).some(
      (deliveryInfo) =>
        deliveryInfo.status === DeliveryInfoStatus.FETCHED_BY_RESEARCHER ||
        deliveryInfo.status === DeliveryInfoStatus.RESULTS_AVAILABLE,
    )
  ) {
    return ProposalSubstatus.ExpectDataDeliveryDone;
  }

  if (
    ((dataDelivery.deliveryInfos || []).length === 0 ||
      (dataDelivery.deliveryInfos || []).every(
        (deliveryInfo) => deliveryInfo.status === DeliveryInfoStatus.CANCELED,
      )) &&
    dataDelivery.acceptance === DeliveryAcceptance.ACCEPTED
  ) {
    return ProposalSubstatus.ExpectDataDeliveryEmptyDeliveries;
  }

  if (
    (dataDelivery.deliveryInfos || []).every(
      (deliveryInfo) =>
        deliveryInfo.status === DeliveryInfoStatus.PENDING ||
        deliveryInfo.status === DeliveryInfoStatus.WAITING_FOR_DATA_SET ||
        deliveryInfo.status === DeliveryInfoStatus.CANCELED,
    )
  ) {
    return ProposalSubstatus.ExpectDataDeliveryPending;
  }

  if (dataDelivery.acceptance === DeliveryAcceptance.DENIED) {
    return ProposalSubstatus.ExpectDataDeliveryDmsDenied;
  }

  if (dataDelivery.acceptance === DeliveryAcceptance.PENDING) {
    return ProposalSubstatus.ExpectDataDeliveryWaitingForDmsResponse;
  }

  return ProposalSubstatus.ExpectDataDeliverySelectDms;
};

export const getSubstatus = (proposal: IProposalGetListSchema): ProposalSubstatus => {
  switch (proposal.status) {
    case ProposalStatus.Draft: {
      return ProposalSubstatus.Draft;
    }

    case ProposalStatus.Rework: {
      return ProposalSubstatus.Rework;
    }

    case ProposalStatus.Rejected: {
      return ProposalSubstatus.Rejected;
    }

    case ProposalStatus.FdpgCheck: {
      return getFdpgCheckSubstatus(proposal);
    }

    case ProposalStatus.LocationCheck: {
      return getLocationCheckSubstatus(proposal);
    }

    case ProposalStatus.Contracting: {
      return getContractingSubstatus(proposal);
    }

    case ProposalStatus.ExpectDataDelivery: {
      return getExpectDataDeliverySubstatus(proposal);
    }

    case ProposalStatus.DataCorrupt: {
      return ProposalSubstatus.DataCorrupt;
    }

    case ProposalStatus.DataResearch: {
      return ProposalSubstatus.DataResearch;
    }

    case ProposalStatus.FinishedProject: {
      return ProposalSubstatus.FinishedProject;
    }

    case ProposalStatus.ReadyToArchive: {
      return ProposalSubstatus.ReadyToArchive;
    }

    case ProposalStatus.ReadyToPublish: {
      return ProposalSubstatus.ReadyToPublish;
    }

    case ProposalStatus.Published: {
      return ProposalSubstatus.Published;
    }

    case ProposalStatus.Archived: {
      return ProposalSubstatus.Archived;
    }

    default: {
      console.warn(`Could not map status ${proposal.status} to a substatus`);
      return null;
    }
  }
};
