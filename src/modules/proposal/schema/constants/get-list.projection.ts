import { Proposal } from '../proposal.schema';

export const GetListProjection: Partial<Record<NestedPath<Proposal>, number>> = {
  projectAbbreviation: 1,
  createdAt: 1,
  updatedAt: 1,
  submittedAt: 1,
  dueDateForStatus: 1,
  ownerName: 1,
  ownerId: 1,
  _id: 1,
  openDizChecks: 1,
  dizApprovedLocations: 1,
  signedContracts: 1,
  uacApprovedLocations: 1,
  conditionalApprovals: 1,
  numberOfRequestedLocations: 1,
  numberOfApprovedLocations: 1,
  requestedButExcludedLocations: 1,
  totalPromisedDataAmount: 1,
  totalContractedDataAmount: 1,
  status: 1,
  isLocked: 1,
  'userProject.generalProjectInformation.projectTitle': 1,
  'requestedData.desiredDataAmount': 1,
  openFdpgTasks: 1,
  contractAcceptedByResearcher: 1,
  contractRejectedByResearcher: 1,
};
