import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { SetDizApprovalDto } from '../../dto/set-diz-approval.dto';
import { SetUacApprovalDto } from '../../dto/set-uac-approval.dto';
import { UploadDto } from '../../dto/upload.dto';
import { FdpgTaskType } from '../../enums/fdpg-task-type.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { ConditionalApproval } from '../../schema/sub-schema/conditional-approval.schema';
import { addFdpgTaskAndReturnId, removeFdpgTask } from '../add-fdpg-task.util';
import {
  addDizApproval,
  addDizConditionApproval,
  addUacApprovalWithCondition,
  addDizConditionReview,
} from '../add-location-vote.util';
import { clearLocationsVotes } from '../location-flow.util';
import { SetDizConditionApprovalDto } from '../../dto/set-diz-condition-approval.dto';

jest.mock('../location-flow.util', () => ({
  clearLocationsVotes: jest.fn(),
}));

jest.mock('../add-fdpg-task.util', () => ({
  addFdpgTaskAndReturnId: jest.fn().mockReturnValue('taskId'),
  removeFdpgTask: jest.fn(),
}));

describe('addLocationVoteUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
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

  const proposalId = 'proposalId';

  const proposalContent = {
    _id: proposalId,
    projectAbbreviation: 'projectAbbreviation',
    status: ProposalStatus.FdpgCheck,
    requestedData: {},
    dizApprovedLocations: [],
    requestedButExcludedLocations: [],
    uacApprovedLocations: [],
    openDizConditionChecks: [],
    uacApprovals: [],
    declineReasons: [],
  };
  const getProposalDocument = () => {
    const proposalDocument = {
      ...JSON.parse(JSON.stringify(proposalContent)),
    };
    return proposalDocument as any as ProposalDocument;
  };

  describe('addDizApproval', () => {
    it('should add the diz Approval', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = new SetDizApprovalDto();
      vote.value = true;

      addDizApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(proposal.dizApprovedLocations).toEqual([request.user.miiLocation]);
    });

    it('should add the diz decline', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = new SetDizApprovalDto();
      vote.value = false;
      vote.declineReason = 'declineReason';

      addDizApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(proposal.dizApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.requestedButExcludedLocations).toEqual([request.user.miiLocation]);
      expect(proposal.declineReasons.length).toEqual(1);
      expect(proposal.declineReasons[0].location).toEqual(request.user.miiLocation);
      expect(proposal.declineReasons[0].reason).toEqual(vote.declineReason);
    });
  });

  describe('addUacApproval', () => {
    it('should add the uac Approval', () => {
      const proposal = getProposalDocument();

      const request = getRequest();
      const vote = new SetUacApprovalDto();
      vote.value = true;

      const upload = {
        _id: 'uploadId',
      } as any as UploadDto;
      addUacApprovalWithCondition(proposal, request.user, vote, upload);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(proposal.openDizConditionChecks).toEqual([request.user.miiLocation]);
      expect(proposal.locationConditionDraft.length).toEqual(1);
      expect(proposal.locationConditionDraft[0].location).toEqual(request.user.miiLocation);
      expect(proposal.locationConditionDraft[0].isContractSigned).toEqual(false);
    });

    it('should add the uac decline', () => {
      const proposal = getProposalDocument();
      proposal.numberOfRequestedLocations = 1;
      proposal.conditionalApprovals = [];
      const request = getRequest();
      const vote = new SetUacApprovalDto();
      vote.value = false;
      vote.declineReason = 'declineReason';

      const upload = {
        _id: 'uploadId',
      } as any as UploadDto;
      addUacApprovalWithCondition(proposal, request.user, vote, upload);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);

      expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.openDizConditionChecks).not.toEqual([request.user.miiLocation]);
      expect(proposal.requestedButExcludedLocations).toEqual([request.user.miiLocation]);
    });
  });

  describe('addDizConditionalApproval', () => {
    it('should add the uac Approval', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = new SetDizConditionApprovalDto();
      vote.value = true;
      vote.dataAmount = 100;

      addDizConditionApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(proposal.openDizConditionChecks).toEqual([]);
      expect(proposal.openDizConditionChecks.length).toEqual(0);
      expect(proposal.uacApprovals[0].location).toEqual(request.user.miiLocation);
      expect(proposal.uacApprovals[0].dataAmount).toEqual(vote.dataAmount);
      expect(proposal.uacApprovals[0].isContractSigned).toEqual(false);
      expect(proposal.locationConditionDraft?.length ?? 0).toEqual(0);
      expect(proposal.totalPromisedDataAmount).toEqual(vote.dataAmount);
    });

    it('should add the uac decline', () => {
      const proposal = getProposalDocument();
      proposal.numberOfRequestedLocations = 1;
      const request = getRequest();
      const vote = new SetUacApprovalDto();
      vote.value = false;
      vote.declineReason = 'declineReason';

      addDizConditionApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(addFdpgTaskAndReturnId).toBeCalledWith(proposal, FdpgTaskType.UacApprovalComplete);

      expect(proposal.dizApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.requestedButExcludedLocations).toEqual([request.user.miiLocation]);
      expect(proposal.declineReasons.length).toEqual(1);
      expect(proposal.declineReasons[0].location).toEqual(request.user.miiLocation);
      expect(proposal.declineReasons[0].reason).toEqual(vote.declineReason);
    });
  });

  describe('addDizConditionalApproval', () => {
    it('should add the uac Approval', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = new SetDizConditionApprovalDto();
      vote.value = true;
      vote.dataAmount = 100;

      addDizConditionApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(proposal.openDizConditionChecks).toEqual([]);
      expect(proposal.openDizConditionChecks.length).toEqual(0);
      expect(proposal.uacApprovals[0].location).toEqual(request.user.miiLocation);
      expect(proposal.uacApprovals[0].dataAmount).toEqual(vote.dataAmount);
      expect(proposal.uacApprovals[0].isContractSigned).toEqual(false);
      expect(proposal.locationConditionDraft?.length ?? 0).toEqual(0);
      expect(proposal.totalPromisedDataAmount).toEqual(vote.dataAmount);
    });

    it('should add the uac decline', () => {
      const proposal = getProposalDocument();
      proposal.numberOfRequestedLocations = 1;
      const request = getRequest();
      const vote = new SetUacApprovalDto();
      vote.value = false;
      vote.declineReason = 'declineReason';

      addDizConditionApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(addFdpgTaskAndReturnId).toBeCalledWith(proposal, FdpgTaskType.UacApprovalComplete);

      expect(proposal.dizApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.requestedButExcludedLocations).toEqual([request.user.miiLocation]);
      expect(proposal.declineReasons.length).toEqual(1);
      expect(proposal.declineReasons[0].location).toEqual(request.user.miiLocation);
      expect(proposal.declineReasons[0].reason).toEqual(vote.declineReason);
    });
  });

  describe('addDizConditionReview', () => {
    it('should add the condition review for accepting', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = true;

      const condition = new ConditionalApproval();
      condition.location = MiiLocation.UKRUB;
      condition.fdpgTaskId = 'taskId';
      condition.dataAmount = 100;

      addDizConditionReview(proposal, condition, vote, request.user);

      expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
      expect(removeFdpgTask).toBeCalledWith(proposal, condition.fdpgTaskId);

      expect(condition.isAccepted).toEqual(vote);
      expect(condition.reviewedAt).toBeDefined();
      expect(condition.reviewedByOwnerId).toEqual(request.user.userId);
      expect(proposal.totalPromisedDataAmount).toEqual(100);
      expect(proposal.uacApprovedLocations).toEqual([condition.location]);
      expect(addFdpgTaskAndReturnId).toBeCalledWith(proposal, FdpgTaskType.DataAmountReached);
    });

    it('should add the condition review for declining', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = false;

      const condition = new ConditionalApproval();
      condition.location = MiiLocation.UKRUB;
      condition.fdpgTaskId = 'taskId';
      condition.dataAmount = 100;

      addDizConditionReview(proposal, condition, vote, request.user);

      expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
      expect(removeFdpgTask).toBeCalledWith(proposal, condition.fdpgTaskId);

      expect(condition.isAccepted).toEqual(vote);
      expect(condition.reviewedAt).toBeDefined();
      expect(condition.reviewedByOwnerId).toEqual(request.user.userId);
      expect(proposal.requestedButExcludedLocations).toEqual([condition.location]);
    });
  });
});
