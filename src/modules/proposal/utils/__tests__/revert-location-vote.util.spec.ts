import { getLocationState } from '../validate-access.util';
import { DeclineReason } from '../../schema/sub-schema/decline-reason.schema';
import { UacApproval } from '../../schema/sub-schema/uac-approval.schema';
import { revertLocationVote } from '../revert-location-vote.util';
import { ProposalUploadService } from '../../services/proposal-upload.service';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { clearLocationsVotes } from '../location-flow.util';
import { ConditionalApproval } from '../../schema/sub-schema/conditional-approval.schema';
import { FdpgTaskType } from '../../enums/fdpg-task-type.enum';
import { removeFdpgTask } from '../add-fdpg-task.util';

jest.mock('../location-flow.util', () => ({
  clearLocationsVotes: jest.fn(),
}));

jest.mock('../add-fdpg-task.util', () => ({
  removeFdpgTask: jest.fn(),
}));
jest.mock('../validate-access.util', () => ({
  getLocationState: jest.fn(),
}));

const proposalUploadServiceMock = {
  deleteUpload: jest.fn(),
} as any as ProposalUploadService;

describe('revertLocationVoteUtil', () => {
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

  describe('handleLocationVote', () => {
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
      await revertLocationVote(proposal, declineReason.location, request.user, proposalUploadServiceMock);

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
      await revertLocationVote(proposal, uacApproval.location, request.user, proposalUploadServiceMock);
      expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
      expect(proposal.uacApprovals.length).toEqual(0);
      expect(proposal.uacApprovals).not.toEqual([uacApproval]);
      expect(clearLocationsVotes).toBeCalledWith(proposal, uacApproval.location);
      expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.openDizChecks).toEqual([uacApproval.location]);
    });

    describe('should remove Fdpg Task in case of uacApproved and expected data amount reached', () => {
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
          uacApproved: true,
        });

        expect(proposal.uacApprovals).toEqual([approval]);
        await revertLocationVote(proposal, approval.location, request.user, proposalUploadServiceMock);
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

    describe('should remove Fdpg Task in case of uacApproved and uacApprovalComplete', () => {
      const testCases = [
        {
          name: 'not completed',
          isCompleted: false,
        },
        {
          name: 'completed',
          isCompleted: true,
        },
      ];

      test.each(testCases)('%s', async ({ isCompleted }) => {
        const approval = new UacApproval();
        approval.location = MiiLocation.UKRUB;
        const condition = new ConditionalApproval();
        condition.location = MiiLocation.UKRUB;
        condition.fdpgTaskId = FdpgTaskType.UacApprovalComplete;
        const proposal = getProposalDocument();
        proposal.uacApprovedLocations = [MiiLocation.UKRUB];
        proposal.conditionalApprovals = [condition];
        proposal.uacApprovals = [approval];
        proposal.openDizChecks = [];
        proposal.requestedButExcludedLocations = [MiiLocation.UMG, MiiLocation.UKL];

        proposal.numberOfRequestedLocations = isCompleted ? 3 : 2;

        const request = getRequest();

        getLocationStateMock.mockReturnValueOnce({
          ...locationStateDefault,
          uacApproved: true,
        });

        expect(proposal.uacApprovals).toEqual([approval]);
        await revertLocationVote(proposal, approval.location, request.user, proposalUploadServiceMock);
        expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
        if (!isCompleted) {
          expect(removeFdpgTask).toBeCalledWith(proposal, condition.fdpgTaskId);
        } else {
          expect(removeFdpgTask).not.toBeCalledWith(proposal, condition.fdpgTaskId);
        }
        expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
        expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
        expect(proposal.openDizChecks).toEqual([condition.location]);
      });
    });

    describe('should remove Fdpg Task in case of conditionalApprovalAccepted and expected data amount reached', () => {
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
        condition.fdpgTaskId = FdpgTaskType.DataAmountReached;
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
        await revertLocationVote(proposal, approval.location, request.user, proposalUploadServiceMock);
        expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
        if (expectedDataAmountReached) {
          expect(removeFdpgTask).not.toBeCalledWith(proposal, condition.fdpgTaskId);
        } else {
          expect(removeFdpgTask).toBeCalledWith(proposal, condition.fdpgTaskId);
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
      await revertLocationVote(proposal, condition.location, request.user, proposalUploadServiceMock);
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

      await revertLocationVote(proposal, condition.location, request.user, proposalUploadServiceMock);
      expect(getLocationStateMock).toBeCalledWith(proposal, request.user);
      expect(proposalUploadServiceMock.deleteUpload).toBeCalledTimes(1);
      expect(proposalUploadServiceMock.deleteUpload).toBeCalledWith(proposal._id, condition.uploadId, request.user);
      expect(clearLocationsVotes).toBeCalledWith(proposal, condition.location);
      expect(proposal.uacApprovedLocations).not.toEqual([request.user.miiLocation]);
      expect(proposal.openDizChecks).toEqual([condition.location]);
    });
  });
});
