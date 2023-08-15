import { SYSTEM_OWNER_ID } from 'src/shared/constants/global.constants';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import {
  clearLocationsVotes,
  declineUnansweredConditions,
  declineUnselectedLocations,
  declineUnansweredContracts,
  excludeAllRequestedLocations,
} from '../location-flow.util';

const proposalId = 'proposalId';
const conditionalApproval = {
  reviewedAt: undefined,
  signedAt: undefined,
  location: MiiLocation.UKMR,
};
const uacApproval = {
  signedAt: undefined,
  location: MiiLocation.UKMR,
};
const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.Draft,
  openDizChecks: [MiiLocation.UKL],
  dizApprovedLocations: [MiiLocation.UKM],
  uacApprovedLocations: [MiiLocation.UKMR],
  signedContracts: [MiiLocation.UKR],
  requestedButExcludedLocations: [MiiLocation.UKD],
  conditionalApprovals: [conditionalApproval],
  uacApprovals: [uacApproval],
  history: [],
  declineReasons: [],
};
const getProposalDocument = () => {
  const proposalDocument = {
    ...JSON.parse(JSON.stringify(proposalContent)),
  };
  return proposalDocument as any as ProposalDocument;
};

const requestContent = {
  user: {
    userId: 'userId',
    firstName: 'firstName',
    lastName: 'lastName',
    fullName: 'fullName',
    email: 'info@appsfactory.de',
    username: 'username',
    email_verified: true,
    roles: [Role.Researcher],
    singleKnownRole: Role.Researcher,
    miiLocation: MiiLocation.UKL,
    isFromLocation: false,
    isKnownLocation: true,
  },
} as FdpgRequest;

const getRequest = () => JSON.parse(JSON.stringify(requestContent)) as FdpgRequest;

describe('location-flow.util', () => {
  describe('clearLocationsVotes', () => {
    it('should clear the locations votes', () => {
      const proposal = getProposalDocument();
      clearLocationsVotes(proposal, MiiLocation.UKL);
      expect(proposal.openDizChecks.length).toEqual(0);
      expect(proposal.dizApprovedLocations.length).toEqual(1);
      expect(proposal.uacApprovedLocations.length).toEqual(1);
      expect(proposal.signedContracts.length).toEqual(1);
      expect(proposal.requestedButExcludedLocations.length).toEqual(1);
    });
  });

  describe('excludeAllRequestedLocations', () => {
    it('should exclude all requested locations', () => {
      const proposal = getProposalDocument();
      excludeAllRequestedLocations(proposal);
      expect(proposal.openDizChecks.length).toEqual(0);
      expect(proposal.dizApprovedLocations.length).toEqual(0);
      expect(proposal.uacApprovedLocations.length).toEqual(0);
      expect(proposal.signedContracts.length).toEqual(0);
      expect(proposal.requestedButExcludedLocations.length).toEqual(5);
    });
  });

  describe('declineUnansweredConditions', () => {
    it('should decline unanswered conditions', () => {
      const proposal = getProposalDocument();
      declineUnansweredConditions(proposal, requestContent.user);
      expect(proposal.uacApprovedLocations.length).toEqual(0);
      expect(proposal.conditionalApprovals.length).toEqual(1);
      expect(proposal.conditionalApprovals[0].reviewedAt).toBeDefined();
      expect(proposal.conditionalApprovals[0].reviewedByOwnerId).toEqual(SYSTEM_OWNER_ID);
      expect(proposal.conditionalApprovals[0].isAccepted).toEqual(false);
      expect(proposal.conditionalApprovals[0].isContractSigned).toEqual(false);

      expect(proposal.history.length).toEqual(1);
    });
  });

  describe('declineUnselectedLocations', () => {
    it('should decline unanswered conditions', () => {
      const proposal = getProposalDocument();
      declineUnselectedLocations(proposal, requestContent.user, [MiiLocation.Charité]);
      expect(proposal.uacApprovedLocations.length).toEqual(1);
      expect(proposal.uacApprovals[0].isContractSigned).toEqual(false);

      expect(proposal.history.length).toEqual(2);
    });
  });

  describe('declineUnansweredContracts', () => {
    it('should decline unanswered contracts', () => {
      const proposal = getProposalDocument();
      declineUnansweredContracts(proposal, requestContent.user);

      expect(proposal.uacApprovals.length).toEqual(1);
      expect(proposal.uacApprovals[0].signedAt).toBeDefined();
      expect(proposal.uacApprovals[0].signedByOwnerId).toEqual(SYSTEM_OWNER_ID);
      expect(proposal.uacApprovals[0].isContractSigned).toEqual(false);

      expect(proposal.conditionalApprovals.length).toEqual(1);
      expect(proposal.conditionalApprovals[0].signedAt).toBeDefined();
      expect(proposal.conditionalApprovals[0].signedByOwnerId).toEqual(SYSTEM_OWNER_ID);
      expect(proposal.conditionalApprovals[0].isContractSigned).toEqual(false);

      expect(proposal.history.length).toEqual(2);
    });
  });
});
