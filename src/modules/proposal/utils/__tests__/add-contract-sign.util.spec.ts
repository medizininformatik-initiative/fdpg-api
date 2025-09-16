import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { SignContractDto } from '../../dto/sign-contract.dto';
import { addContractSign } from '../add-contract-sign.util';
import { UacApproval } from '../../schema/sub-schema/uac-approval.schema';
import { addFdpgTaskAndReturnId } from '../add-fdpg-task.util';
import { FdpgTaskType } from '../../enums/fdpg-task-type.enum';
import { ConditionalApproval } from '../../schema/sub-schema/conditional-approval.schema';
import { DeclineType } from '../../enums/decline-type.enum';

jest.mock('../location-flow.util', () => ({
  clearLocationsVotes: jest.fn(),
}));

jest.mock('../add-fdpg-task.util', () => ({
  addFdpgTaskAndReturnId: jest.fn(),
}));

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

const getRequest = () => requestContent;

const proposalId = 'proposalId';

const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.Contracting,
  signedContracts: [],
  requestedButExcludedLocations: [],
  declineReasons: [],
};
const getProposalDocument = () => {
  const proposalDocument = {
    ...proposalContent,
  };
  return proposalDocument as any as ProposalDocument;
};

describe('AddContractSignUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe(`addContractSign for ${Role.Researcher}`, () => {
    let proposal: ProposalDocument;
    let request: FdpgRequest;

    beforeEach(() => {
      proposal = getProposalDocument();
      request = getRequest();
      request.user.singleKnownRole = Role.Researcher;
    });

    it(`should handle the ${Role.Researcher} sign for accepting`, () => {
      const vote = new SignContractDto();
      vote.value = true;

      addContractSign(proposal, vote, request.user);

      expect(proposal.researcherSignedAt).toBeDefined();
      expect(proposal.statusChangeToLocationContractingAt).toBeDefined();

      expect(proposal.contractRejectedByResearcher).toBeFalsy();
      expect(proposal.contractAcceptedByResearcher).toBeTruthy();
    });

    it(`should handle the ${Role.Researcher} sign for declining`, () => {
      const vote = new SignContractDto();
      vote.value = false;

      addContractSign(proposal, vote, request.user);

      expect(proposal.researcherSignedAt).toBeDefined();
      expect(proposal.statusChangeToLocationContractingAt).not.toBeDefined();

      expect(proposal.contractRejectedByResearcher).toBeTruthy();
      expect(proposal.contractAcceptedByResearcher).toBeFalsy();
    });
  });

  describe(`addContractSign for ${Role.DizMember}`, () => {
    let proposal: ProposalDocument;
    let request: FdpgRequest;

    beforeEach(() => {
      proposal = getProposalDocument();
      proposal.signedContracts = [];
      request = getRequest();
      request.user.singleKnownRole = Role.DizMember;
    });

    it(`should handle the ${Role.DizMember} sign for approved proposals`, () => {
      const uacApproval = { location: request.user.miiLocation, dataAmount: 100 } as any as UacApproval;
      proposal.uacApprovals = [uacApproval];
      proposal.conditionalApprovals = [];
      proposal.uacApprovedLocations = [MiiLocation.UKL];
      const vote = new SignContractDto();
      vote.value = true;

      addContractSign(proposal, vote, request.user);

      expect(proposal.signedContracts).toContain(request.user.miiLocation);
      expect(proposal.totalContractedDataAmount).toBe(100);

      expect(uacApproval.signedAt).toBeDefined();
      expect(uacApproval.signedByOwnerId).toBe(request.user.userId);
      expect(uacApproval.isContractSigned).toBeTruthy();
    });

    it(`should handle the ${Role.DizMember} sign for approved proposals and complete contracting`, () => {
      const uacApproval = { location: request.user.miiLocation, dataAmount: 100 } as any as UacApproval;
      proposal.uacApprovals = [uacApproval];
      proposal.conditionalApprovals = [];
      proposal.uacApprovedLocations = [];
      const vote = new SignContractDto();
      vote.value = true;

      addContractSign(proposal, vote, request.user);

      expect(proposal.signedContracts).toContain(request.user.miiLocation);
      expect(proposal.totalContractedDataAmount).toBe(100);

      expect(uacApproval.signedAt).toBeDefined();
      expect(uacApproval.signedByOwnerId).toBe(request.user.userId);
      expect(uacApproval.isContractSigned).toBeTruthy();
      expect(addFdpgTaskAndReturnId).toHaveBeenCalledWith(proposal, FdpgTaskType.ContractComplete);
    });

    it(`should handle the ${Role.DizMember} sign for conditional approved proposals`, () => {
      const uacApproval = { location: request.user.miiLocation, dataAmount: 100 } as any as ConditionalApproval;
      proposal.uacApprovals = [];
      proposal.conditionalApprovals = [uacApproval];
      proposal.uacApprovedLocations = [MiiLocation.UKL];
      const vote = new SignContractDto();
      vote.value = true;

      addContractSign(proposal, vote, request.user);

      expect(proposal.signedContracts).toContain(request.user.miiLocation);
      expect(proposal.totalContractedDataAmount).toBe(100);

      expect(uacApproval.signedAt).toBeDefined();
      expect(uacApproval.signedByOwnerId).toBe(request.user.userId);
      expect(uacApproval.isContractSigned).toBeTruthy();
    });

    it(`should handle the ${Role.DizMember} decline`, () => {
      const uacApproval = { location: request.user.miiLocation, dataAmount: 100 } as any as UacApproval;
      proposal.uacApprovals = [uacApproval];
      proposal.conditionalApprovals = [];
      proposal.uacApprovedLocations = [MiiLocation.UKL];
      proposal.totalContractedDataAmount = 0;
      const vote = new SignContractDto();
      vote.value = false;
      vote.declineReason = 'declineReason';

      addContractSign(proposal, vote, request.user);

      expect(proposal.signedContracts).not.toContain(request.user.miiLocation);
      expect(proposal.totalContractedDataAmount).toBe(0);

      expect(uacApproval.signedAt).toBeDefined();
      expect(uacApproval.signedByOwnerId).toBe(request.user.userId);
      expect(uacApproval.isContractSigned).toBeFalsy();
      expect(proposal.requestedButExcludedLocations).toContain(request.user.miiLocation);
      expect(proposal.declineReasons[0].location).toBe(request.user.miiLocation);
      expect(proposal.declineReasons[0].type).toBe(DeclineType.LocationSign);
      expect(proposal.declineReasons[0].reason).toBe(vote.declineReason);
      expect(proposal.declineReasons[0].createdAt).toBeDefined();
    });
  });
});
