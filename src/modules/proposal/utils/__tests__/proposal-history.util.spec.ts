import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { HistoryEventType } from '../../enums/history-event.enum';
import {
  addHistoryItemForStatus,
  addHistoryItemForDizApproval,
  addHistoryItemForUacApproval,
  addHistoryItemForUacCondition,
  addHistoryItemForContractSign,
  addHistoryItemForContractSystemReject,
  addHistoryItemForProposalLock,
} from '../proposal-history.util';

const proposalId = 'proposalId';

const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.Draft,

  history: [],
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

describe('ProposalHistoryUtil', () => {
  describe('addHistoryItemForStatus', () => {
    const testcases = [
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.Draft,
        type: undefined,
      },
      {
        status: undefined,
        newStatus: ProposalStatus.Draft,
        type: HistoryEventType.ProposalCreated,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.FdpgCheck,
        type: HistoryEventType.ProposalFdpgCheck,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.Rework,
        type: HistoryEventType.ProposalRework,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.Rejected,
        type: HistoryEventType.ProposalRejected,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.LocationCheck,
        type: HistoryEventType.ProposalLocationCheck,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.Contracting,
        type: HistoryEventType.ProposalContracting,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.ExpectDataDelivery,
        type: HistoryEventType.ProposalDataDelivery,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.DataResearch,
        type: HistoryEventType.ProposalDataResearch,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.DataCorrupt,
        type: HistoryEventType.ProposalDataCorrupt,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.FinishedProject,
        type: HistoryEventType.ProposalFinished,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.ReadyToArchive,
        type: HistoryEventType.ProposalReadyToArchive,
      },
      {
        status: ProposalStatus.Draft,
        newStatus: ProposalStatus.Archived,
        type: HistoryEventType.ProposalArchived,
      },
    ];

    test.each(testcases)('should add history item for status', ({ status, newStatus, type }) => {
      const request = getRequest();
      const proposal = getProposalDocument();
      proposal.status = newStatus;
      addHistoryItemForStatus(proposal, request.user, status);

      if (type) {
        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(type);
      } else {
        expect(proposal.history.length).toBe(0);
      }
    });
  });

  describe('addHistoryItemForDizApproval', () => {
    test.each([true, false])(`should add history item for diz approval (isApproved: %s)`, (isApproved) => {
      const request = getRequest();
      const proposal = getProposalDocument();
      addHistoryItemForDizApproval(proposal, request.user, isApproved);

      expect(proposal.history.length).toBe(1);
      expect(proposal.history[0].type).toBe(
        isApproved ? HistoryEventType.DizVoteAccept : HistoryEventType.DizVoteDecline,
      );
    });
  });

  describe('addHistoryItemForUacApproval', () => {
    const testcases = [
      {
        isApproved: true,
        type: HistoryEventType.UacVoteAccept,
        hasCondition: false,
      },
      {
        isApproved: false,
        type: HistoryEventType.UacVoteDecline,
        hasCondition: false,
      },
      {
        isApproved: true,
        type: HistoryEventType.UacVoteConditionalAccept,
        hasCondition: true,
      },
    ];

    test.each(testcases)(`should add history item for uac approval`, ({ isApproved, type, hasCondition }) => {
      const request = getRequest();
      const proposal = getProposalDocument();
      addHistoryItemForUacApproval(proposal, request.user, isApproved, hasCondition);

      expect(proposal.history.length).toBe(1);
      expect(proposal.history[0].type).toBe(type);
    });
  });

  describe('addHistoryItemForUacCondition', () => {
    test.each([true, false])(`should add history item for uac condition (isApproved: %s)`, (isApproved) => {
      const request = getRequest();
      const proposal = getProposalDocument();

      addHistoryItemForUacCondition(proposal, request.user, isApproved, request.user.miiLocation);

      expect(proposal.history.length).toBe(1);

      const expectedType = isApproved ? HistoryEventType.UacConditionAccept : HistoryEventType.UacConditionDecline;
      expect(proposal.history[0].type).toBe(expectedType);
    });
  });

  describe('addHistoryItemForContractSign', () => {
    const testcases = [
      {
        isApproved: true,
        singleKnownRole: Role.Researcher,
        type: HistoryEventType.ContractResearcherApproved,
      },
      {
        isApproved: false,
        singleKnownRole: Role.Researcher,
        type: HistoryEventType.ContractResearcherRejected,
      },
      {
        isApproved: true,
        singleKnownRole: Role.DizMember,
        type: HistoryEventType.ContractLocationApproved,
      },
      {
        isApproved: false,
        singleKnownRole: Role.DizMember,
        type: HistoryEventType.ContractLocationRejected,
      },
    ];

    test.each(testcases)(`should add history item for contract sign`, ({ isApproved, singleKnownRole, type }) => {
      const request = getRequest();
      const proposal = getProposalDocument();
      request.user.singleKnownRole = singleKnownRole;
      addHistoryItemForContractSign(proposal, request.user, isApproved);

      expect(proposal.history.length).toBe(1);
      expect(proposal.history[0].type).toBe(type);
    });
  });

  describe('addHistoryItemForContractSystemReject', () => {
    test(`should add history item for contract system reject`, () => {
      const request = getRequest();
      const proposal = getProposalDocument();
      addHistoryItemForContractSystemReject(proposal, request.user, request.user.miiLocation);

      expect(proposal.history.length).toBe(1);
      expect(proposal.history[0].type).toBe(HistoryEventType.ContractSystemRejected);
    });
  });

  describe('addHistoryItemForProposalLock', () => {
    test.each([true, false])(`should add history item for proposal lock (isLocked: %s)`, (isLocked) => {
      const request = getRequest();
      const proposal = getProposalDocument();
      addHistoryItemForProposalLock(proposal, request.user, isLocked);

      expect(proposal.history.length).toBe(1);

      const expectedType = isLocked ? HistoryEventType.ProposalLockTrue : HistoryEventType.ProposalLockFalse;
      expect(proposal.history[0].type).toBe(expectedType);
    });
  });
});
