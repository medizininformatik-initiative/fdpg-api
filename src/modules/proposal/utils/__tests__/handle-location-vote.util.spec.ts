import { getLocationState } from './../validate-access.util';
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
import { DeclineReason } from '../../schema/sub-schema/decline-reason.schema';
import { UacApproval } from '../../schema/sub-schema/uac-approval.schema';
import { addFdpgTaskAndReturnId, removeFdpgTask } from '../add-fdpg-task.util';
import {
  addDizApproval,
  addUacApproval,
  addUacApprovalWithCondition,
  addUacConditionReview,
  handleLocationDecision,
} from '../handle-location-vote.util';
import { clearLocationsVotes } from '../location-flow.util';
import { ProposalUploadService } from '../../services/proposal-upload.service';

jest.mock('../location-flow.util', () => ({
  clearLocationsVotes: jest.fn(),
  deleteConditionalUpload: jest.fn(),
}));

jest.mock('../add-fdpg-task.util', () => ({
  addFdpgTaskAndReturnId: jest.fn().mockReturnValue('taskId'),
  removeFdpgTask: jest.fn(),
}));

jest.mock('../validate-access.util', () => ({
  getLocationState: jest.fn(),
}));

const proposalUploadServiceMock = {
  deleteUpload: jest.fn(),
} as any as ProposalUploadService;

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
      vote.dataAmount = 100;

      const upload = {
        _id: 'uploadId',
      } as any as UploadDto;
      addUacApprovalWithCondition(proposal, request.user.miiLocation, upload, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(proposal.uacApprovedLocations).toEqual([request.user.miiLocation]);
      expect(proposal.conditionalApprovals.length).toEqual(1);
      expect(proposal.conditionalApprovals[0].location).toEqual(request.user.miiLocation);
      expect(proposal.conditionalApprovals[0].dataAmount).toEqual(vote.dataAmount);
      expect(proposal.conditionalApprovals[0].isContractSigned).toEqual(false);
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
      addUacApprovalWithCondition(proposal, request.user.miiLocation, upload, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(addFdpgTaskAndReturnId).toBeCalledWith(proposal, FdpgTaskType.UacApprovalComplete);

      expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.requestedButExcludedLocations).toEqual([request.user.miiLocation]);
    });
  });

  describe('addUacConditionalApproval', () => {
    it('should add the uac Approval', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = new SetUacApprovalDto();
      vote.value = true;
      vote.dataAmount = 100;

      addUacApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(proposal.uacApprovedLocations).toEqual([request.user.miiLocation]);
      expect(proposal.uacApprovals.length).toEqual(1);
      expect(proposal.uacApprovals[0].location).toEqual(request.user.miiLocation);
      expect(proposal.uacApprovals[0].dataAmount).toEqual(vote.dataAmount);
      expect(proposal.uacApprovals[0].isContractSigned).toEqual(false);
      expect(proposal.totalPromisedDataAmount).toEqual(vote.dataAmount);
    });

    it('should add the uac decline', () => {
      const proposal = getProposalDocument();
      proposal.numberOfRequestedLocations = 1;
      const request = getRequest();
      const vote = new SetUacApprovalDto();
      vote.value = false;
      vote.declineReason = 'declineReason';

      addUacApproval(proposal, request.user, vote);

      expect(clearLocationsVotes).toBeCalledWith(proposal, request.user.miiLocation);
      expect(addFdpgTaskAndReturnId).toBeCalledWith(proposal, FdpgTaskType.UacApprovalComplete);

      expect(proposal.dizApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.requestedButExcludedLocations).toEqual([request.user.miiLocation]);
      expect(proposal.declineReasons.length).toEqual(1);
      expect(proposal.declineReasons[0].location).toEqual(request.user.miiLocation);
      expect(proposal.declineReasons[0].reason).toEqual(vote.declineReason);
    });
  });

  describe('addUacConditionReview', () => {
    it('should add the condition review for accepting', () => {
      const proposal = getProposalDocument();
      const request = getRequest();
      const vote = true;

      const condition = new ConditionalApproval();
      condition.location = MiiLocation.UKRUB;
      condition.fdpgTaskId = 'taskId';
      condition.dataAmount = 100;

      addUacConditionReview(proposal, condition, vote, request.user);

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

      addUacConditionReview(proposal, condition, vote, request.user);

      expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
      expect(removeFdpgTask).toBeCalledWith(proposal, condition.fdpgTaskId);

      expect(condition.isAccepted).toEqual(vote);
      expect(condition.reviewedAt).toBeDefined();
      expect(condition.reviewedByOwnerId).toEqual(request.user.userId);
      expect(proposal.requestedButExcludedLocations).toEqual([condition.location]);
    });
  });

  const locationStateDefault: ReturnType<typeof getLocationState> = {
    isDizCheck: false,
    dizApproved: false,
    uacApproved: false,
    isConditionalApproval: false,
    conditionalApprovalAccepted: false,
    conditionalApprovalDeclined: false,
    contractAcceptedByResearcher: false,
    contractRejectedByResearcher: false,
    signedContract: false,
    signedContractAndContractingDone: false,
    requestedButExcluded: false,
  };

  describe('handleLocationDecision', () => {
    const getLocationStateMock = jest.mocked(getLocationState);

    it('should delete the declineReason object', async () => {
      const declineReason = new DeclineReason();
      declineReason.location = MiiLocation.UKRUB;
      const proposal = getProposalDocument();
      proposal.declineReasons = [declineReason];
      proposal.openDizChecks = [];
      const request = getRequest();

      getLocationStateMock.mockReturnValueOnce({
        ...locationStateDefault,
        requestedButExcluded: true,
      });

      expect(proposal.declineReasons).toEqual([declineReason]);
      await handleLocationDecision(proposal, declineReason.location, request.user, proposalUploadServiceMock);

      expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
      expect(proposal.declineReasons).not.toEqual([declineReason]);
      expect(proposal.declineReasons.length).toEqual(0);
      expect(clearLocationsVotes).toBeCalledWith(proposal, declineReason.location);
      expect(proposal.requestedButExcludedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.openDizChecks).toEqual([declineReason.location]);
    });

    it('should delete the uac approval object', async () => {
      const uacApproval = new UacApproval();
      uacApproval.location = MiiLocation.UKRUB;
      const proposal = getProposalDocument();
      proposal.uacApprovals = [uacApproval];
      proposal.openDizChecks = [];

      const request = getRequest();

      getLocationStateMock.mockReturnValueOnce({
        ...locationStateDefault,
        uacApproved: true,
      });

      expect(proposal.uacApprovals).toEqual([uacApproval]);
      await handleLocationDecision(proposal, uacApproval.location, request.user, proposalUploadServiceMock);
      expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
      expect(proposal.uacApprovals.length).toEqual(0);
      expect(proposal.uacApprovals).not.toEqual([uacApproval]);
      expect(clearLocationsVotes).toBeCalledWith(proposal, uacApproval.location);
      expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.openDizChecks).toEqual([uacApproval.location]);
    });

    describe('should remove Fdpg Task in case of expected data amount reached', () => {
      const testCases = [
        {
          name: 'expected data amount is reached even withouth the location data amount',
          dataAmount: 10,
          expectedDataAmountReached: true,
        },
        {
          name: 'expected data amount is not reached withouth the location data amount',
          dataAmount: 12,
          expectedDataAmountReached: false,
        },
      ];

      test.each(testCases)('%s', async ({ dataAmount, expectedDataAmountReached }) => {
        const approval = new UacApproval();
        approval.location = MiiLocation.UKRUB;
        approval.dataAmount = dataAmount;
        const condition = new ConditionalApproval();
        condition.location = MiiLocation.UKRUB;
        condition.fdpgTaskId = FdpgTaskType.ConditionApproval;
        condition.dataAmount = 10;
        const proposal = getProposalDocument();
        proposal.conditionalApprovals = [condition];
        proposal.uacApprovals = [approval];
        proposal.totalPromisedDataAmount = 21;
        proposal.requestedData.desiredDataAmount = 11;
        proposal.openDizChecks = [];

        const request = getRequest();

        getLocationStateMock.mockReturnValueOnce({
          ...locationStateDefault,
          conditionalApprovalAccepted: true,
        });

        expect(proposal.uacApprovals).toEqual([approval]);
        await handleLocationDecision(proposal, approval.location, request.user, proposalUploadServiceMock);
        expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
        if (expectedDataAmountReached) {
          expect(removeFdpgTask).not.toBeCalledWith(proposal, FdpgTaskType.DataAmountReached);
        } else {
          expect(removeFdpgTask).toBeCalledWith(proposal, FdpgTaskType.DataAmountReached);
        }
        expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
        expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
        expect(proposal.openDizChecks).toEqual([condition.location]);
      });
    });

    it('should delete conditional approval object and fdpg task', async () => {
      const condition = new ConditionalApproval();
      condition.location = MiiLocation.UKRUB;
      condition.fdpgTaskId = FdpgTaskType.ConditionApproval;
      condition.dataAmount = 10;
      const proposal = getProposalDocument();
      proposal.conditionalApprovals = [condition];
      proposal.totalPromisedDataAmount = condition.dataAmount + 1;
      proposal.requestedData.desiredDataAmount = 11;
      proposal.openDizChecks = [];

      const request = getRequest();

      getLocationStateMock.mockReturnValueOnce({
        ...locationStateDefault,
        conditionalApprovalAccepted: true,
      });

      expect(proposal.conditionalApprovals).toEqual([condition]);
      await handleLocationDecision(proposal, condition.location, request.user, proposalUploadServiceMock);
      expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
      expect(removeFdpgTask).toBeCalledWith(proposal, condition.fdpgTaskId);
      expect(proposal.conditionalApprovals).not.toEqual([condition]);
      expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
      expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.openDizChecks).toEqual([condition.location]);
    });

    it('should delete the upload blob', async () => {
      const condition = new ConditionalApproval();
      condition.location = MiiLocation.UKRUB;
      condition.uploadId = 'uploadId';
      const proposal = getProposalDocument();
      proposal.conditionalApprovals = [condition];
      proposal.openDizChecks = [];
      const request = getRequest();

      getLocationStateMock.mockReturnValueOnce({
        ...locationStateDefault,
        isConditionalApproval: true,
      });

      await handleLocationDecision(proposal, condition.location, request.user, proposalUploadServiceMock);
      expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
      expect(proposalUploadServiceMock.deleteUpload).toBeCalledTimes(1);
      expect(proposalUploadServiceMock.deleteUpload).toBeCalledWith(proposal._id, condition.uploadId, request.user);
      expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
      expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.openDizChecks).toEqual([condition.location]);
    });
  });
});
