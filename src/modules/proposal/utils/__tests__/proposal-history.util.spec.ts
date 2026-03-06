import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { HistoryEventType } from '../../enums/history-event.enum';
import {
  addHistoryItemForStatus,
  addHistoryItemForDizApproval,
  addHistoryItemForUacApproval,
  addHistoryItemForUnselectedLocation,
  addHistoryItemForRevertLocationVote,
  addHistoryItemForUacCondition,
  addHistoryItemForContractSign,
  addHistoryItemForContractSystemReject,
  addHistoryItemForProposalLock,
  addHistoryItemForDizConditionReviewApproval,
  addHistoryItemForContractSkipped,
  addHistoryItemForChangedDeadline,
  addHistoryItemForContractUpdate,
  addHistoryItemForParticipantsUpdated,
  addHistoryItemForParticipantAdded,
  addHistoryItemForParticipantRemoved,
  addHistoryItemForCopyAsInternalRegistration,
  addHistoryItemForDmoRequest,
  addHistoryItemForDmoAcceptanceAnswer,
  addHistoryItemForInitiateDelivery,
  addHistoryItemForCanceledDelivery,
  addHistoryItemForForwardedDelivery,
  addHistoryItemForDataDeliveryConcluded,
} from '../proposal-history.util';
import { DueDateEnum } from '../../enums/due-date.enum';
import { DeliveryAcceptance } from '../../enums/data-delivery.enum';
import { Participant } from '../../schema/sub-schema/participant.schema';

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
    miiLocation: 'UKL',
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

  describe('addHistoryItemForFdpgApprovedLocationRemoved', () => {
    it(`should add history item for unselecting approved location from contracting`, () => {
      const request = getRequest();
      const proposal = getProposalDocument();

      addHistoryItemForUnselectedLocation(proposal, request.user, request.user.miiLocation);

      expect(proposal.history.length).toBe(1);

      const expectedType = HistoryEventType.FdpgApprovedLocationRemoved;
      expect(proposal.history[0].type).toBe(expectedType);
    });
  });

  describe('addHistoryItemForRevertLocationVote', () => {
    it('should add history item for reverted location vote', () => {
      const request = getRequest();
      const proposal = getProposalDocument();
      const location = 'UKL';

      addHistoryItemForRevertLocationVote(proposal, request.user, location);
      expect(proposal.history.length).toBe(1);

      const expectedType = HistoryEventType.FdpgLocationVoteReverted;
      expect(proposal.history[0].type).toBe(expectedType);
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

  describe('addHistoryItemForDizConditionReviewApproval', () => {
    const testcases = [
      { vote: false, hasCondition: false, type: HistoryEventType.DizDeclinedOnConditions },
      { vote: true, hasCondition: true, type: HistoryEventType.DizAcceptedWithConditions },
      { vote: true, hasCondition: false, type: HistoryEventType.DizAcceptedWithoutConditions },
    ];

    test.each(testcases)(
      'should add history item (vote: $vote, condition: $hasCondition) -> $type',
      ({ vote, hasCondition, type }) => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForDizConditionReviewApproval(proposal, request.user, vote, hasCondition);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(type);
        expect(proposal.history[0].location).toBe(request.user.miiLocation);
      },
    );
  });

  describe('addHistoryItemForContractSkipped', () => {
    it('should add history item for skipped contracting', () => {
      const request = getRequest();
      const proposal = getProposalDocument();
      addHistoryItemForContractSkipped(proposal, request.user);

      expect(proposal.history.length).toBe(1);
      expect(proposal.history[0].type).toBe(HistoryEventType.ContractingSkipped);
    });
  });

  describe('addHistoryItemForChangedDeadline', () => {
    const testcases = [
      { enum: DueDateEnum.DUE_DAYS_FDPG_CHECK, type: HistoryEventType.FdpgDeadlineChange },
      { enum: DueDateEnum.DUE_DAYS_LOCATION_CHECK, type: HistoryEventType.LocationCheckDeadlineChange },
      { enum: DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING, type: HistoryEventType.LocationContractingDeadlineChange },
      { enum: DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY, type: HistoryEventType.ExpectDataDeliveryDeadlineChange },
      { enum: DueDateEnum.DUE_DAYS_DATA_CORRUPT, type: HistoryEventType.DataCorruptDeadlineChange },
      { enum: DueDateEnum.DUE_DAYS_FINISHED_PROJECT, type: HistoryEventType.FinishedProjectDeadlineChange },
      { enum: 'INVALID_ENUM' as DueDateEnum, type: null }, // Test invalid case
    ];

    test.each(testcases)('should add history item for deadline change: $enum', ({ enum: deadlineType, type }) => {
      const request = getRequest();
      const proposal = getProposalDocument();

      // Mock console.error for invalid case to keep test output clean
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      addHistoryItemForChangedDeadline(deadlineType, proposal, request.user);

      if (type) {
        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(type);
      } else {
        expect(proposal.history.length).toBe(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not determine DueDateEnum'));
      }

      consoleSpy.mockRestore();
    });
  });

  describe('addHistoryItemForContractUpdate', () => {
    it('should add history item for contract update', () => {
      const request = getRequest();
      const proposal = getProposalDocument();
      addHistoryItemForContractUpdate(proposal, request.user);

      expect(proposal.history.length).toBe(1);
      expect(proposal.history[0].type).toBe(HistoryEventType.ContractUpdated);
    });
  });

  describe('Participant History Items', () => {
    const p1 = { researcher: { email: 'p1@test.com', firstName: 'P', lastName: 'One' } } as Participant;
    const p2 = { researcher: { email: 'p2@test.com', firstName: 'P', lastName: 'Two' } } as Participant;

    describe('addHistoryItemForParticipantAdded', () => {
      it('should add history item for participant added', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForParticipantAdded(proposal, request.user, p1);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.ParticipantAdded);
        expect(proposal.history[0].data.participantName).toBe('P One');
      });
    });

    describe('addHistoryItemForParticipantRemoved', () => {
      it('should add history item for participant removed', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForParticipantRemoved(proposal, request.user, p1);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.ParticipantRemoved);
        expect(proposal.history[0].data.participantName).toBe('P One');
      });
    });

    describe('addHistoryItemForParticipantsUpdated', () => {
      it('should detect added participants', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForParticipantsUpdated(proposal, request.user, [p1], [p1, p2]);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.ParticipantAdded);
        expect(proposal.history[0].data.participantName).toBe('P Two');
      });

      it('should detect removed participants', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForParticipantsUpdated(proposal, request.user, [p1, p2], [p1]);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.ParticipantRemoved);
        expect(proposal.history[0].data.participantName).toBe('P Two');
      });

      it('should add generic update if no add/remove but content differs', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        // Same email, different object reference/content (simulated by logic)
        // Since logic uses stringify for comparison if emails match
        const p1Modified = { ...p1, someOtherField: 'changed' } as any;

        addHistoryItemForParticipantsUpdated(proposal, request.user, [p1], [p1Modified]);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.ParticipantUpdated);
      });

      it('should do nothing if lists are identical', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForParticipantsUpdated(proposal, request.user, [p1], [p1]);

        expect(proposal.history.length).toBe(0);
      });
    });
  });

  describe('addHistoryItemForCopyAsInternalRegistration', () => {
    it('should add history item with original proposal info', () => {
      const request = getRequest();
      const proposal = getProposalDocument();
      const originalAbbr = 'ORIG-001';

      addHistoryItemForCopyAsInternalRegistration(proposal, request.user, originalAbbr);

      expect(proposal.history.length).toBe(1);
      expect(proposal.history[0].type).toBe(HistoryEventType.ProposalCopyAsInternalRegistration);
      expect(proposal.history[0].data.originalProposalAbbreviation).toBe(originalAbbr);
    });
  });

  describe('DMO Events', () => {
    describe('addHistoryItemForDmoRequest', () => {
      it('should add DMO request event', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        const dms = 'DMS-Loc';

        addHistoryItemForDmoRequest(proposal, request.user, dms);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.DmoRequest);
        expect(proposal.history[0].data.requestedDms).toBe(dms);
      });
    });

    describe('addHistoryItemForDmoAcceptanceAnswer', () => {
      const testcases = [
        { answer: DeliveryAcceptance.ACCEPTED, type: HistoryEventType.DmoAccept },
        { answer: DeliveryAcceptance.DENIED, type: HistoryEventType.DmoDeny },
      ];

      test.each(testcases)('should add DMO answer event: $answer -> $type', ({ answer, type }) => {
        const request = getRequest();
        const proposal = getProposalDocument();

        addHistoryItemForDmoAcceptanceAnswer(proposal, request.user, answer);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(type);
        expect(proposal.history[0].location).toBe(request.user.miiLocation);
      });
    });
  });

  describe('Data Delivery Events', () => {
    const deliveryName = 'Delivery 1';
    const locations = ['LocA', 'LocB'];

    describe('addHistoryItemForInitiateDelivery', () => {
      it('should add manual entry event', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForInitiateDelivery(proposal, request.user, deliveryName, true, locations);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.DataDeliveryManualEntry);
        expect(proposal.history[0].data.deliveryName).toBe(deliveryName);
        expect(proposal.history[0].data.locations).toEqual(locations);
      });

      it('should add started event for non-manual', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForInitiateDelivery(proposal, request.user, deliveryName, false, locations);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.DataDeliveryStarted);
      });
    });

    describe('addHistoryItemForCanceledDelivery', () => {
      it('should add canceled event', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForCanceledDelivery(proposal, request.user, deliveryName, locations);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.DataDeliveryCanceled);
        expect(proposal.history[0].data.deliveryName).toBe(deliveryName);
      });
    });

    describe('addHistoryItemForForwardedDelivery', () => {
      it('should add forwarded event', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForForwardedDelivery(proposal, request.user, deliveryName, locations);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.DataDeliveryForwarded);
      });
    });

    describe('addHistoryItemForDataDeliveryConcluded', () => {
      it('should add concluded event', () => {
        const request = getRequest();
        const proposal = getProposalDocument();
        addHistoryItemForDataDeliveryConcluded(proposal, request.user, deliveryName);

        expect(proposal.history.length).toBe(1);
        expect(proposal.history[0].type).toBe(HistoryEventType.DataDeliveryConcluded);
        expect(proposal.history[0].data.deliveryName).toBe(deliveryName);
      });
    });
  });
});
