import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { StorageService } from 'src/modules/storage/storage.service';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { NoErrorThrownError, getError } from 'test/get-error';
import { InitContractingDto } from '../../dto/proposal/init-contracting.dto';
import { SetDizApprovalDto } from '../../dto/set-diz-approval.dto';
import { SetUacApprovalDto } from '../../dto/set-uac-approval.dto';
import { SignContractDto } from '../../dto/sign-contract.dto';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { addContractSign } from '../../utils/add-contract-sign.util';
import { addDizApproval, addUacApprovalWithCondition } from '../../utils/add-location-vote.util';
import {
  addHistoryItemForContractSign,
  addHistoryItemForContractUpdate,
  addHistoryItemForDizApproval,
  addHistoryItemForRevertLocationVote,
  addHistoryItemForStatus,
  addHistoryItemForUacApproval,
} from '../../utils/proposal-history.util';
import { addUpload } from '../../utils/proposal.utils';
import { revertLocationVote } from '../../utils/revert-location-vote.util';
import { validateContractSign, validateContractSkip } from '../../utils/validate-contract-sign.util';
import { validateStatusChange } from '../../utils/validate-status-change.util';
import { validateDizApproval, validateRevertLocationVote, validateUacApproval } from '../../utils/validate-vote.util';
import { ProposalContractingService } from '../proposal-contracting.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { ProposalUploadService } from '../proposal-upload.service';
import { StatusChangeService } from '../status-change.service';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { LocationService } from 'src/modules/location/service/location.service';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { validateLocation, validateLocations } from 'src/modules/location/util/validate-location.util';
import { addContractSkip } from '../../utils/add-contract-skip.util';
import { FdpgTaskType } from '../../enums/fdpg-task-type.enum';
import { clearLocationsVotes } from '../../utils/location-flow.util';
import { addFdpgTaskAndReturnId } from '../../utils/add-fdpg-task.util';

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn().mockImplementation((cls, plain) => plain),
  };
});

jest.mock('../../utils/validate-vote.util', () => ({
  validateDizApproval: jest.fn(),
  validateUacApproval: jest.fn(),
  validateRevertLocationVote: jest.fn(),
}));

jest.mock('../../utils/add-location-vote.util', () => ({
  addDizApproval: jest.fn(),
  addUacApproval: jest.fn(),
  addUacApprovalWithCondition: jest.fn(),
  addDizConditionReview: jest.fn(),
}));
jest.mock('../../utils/revert-location-vote.util', () => ({
  revertLocationVote: jest.fn(),
}));

jest.mock('../../utils/proposal-history.util', () => ({
  addHistoryItemForContractSign: jest.fn(),
  addHistoryItemForDizApproval: jest.fn(),
  addHistoryItemForStatus: jest.fn(),
  addHistoryItemForUacApproval: jest.fn(),
  addHistoryItemForUacCondition: jest.fn(),
  addHistoryItemForRevertLocationVote: jest.fn(),
  addHistoryItemForContractUpdate: jest.fn(),
}));

jest.mock('../../utils/proposal.utils', () => ({
  addUpload: jest.fn(),
  getBlobName: jest.fn().mockReturnValue('blobName'),
}));

jest.mock('../../utils/validate-status-change.util', () => ({
  validateStatusChange: jest.fn(),
}));

jest.mock('../../utils/validate-contract-sign.util', () => ({
  validateContractSign: jest.fn(),
}));

jest.mock('../../utils/add-contract-sign.util', () => ({
  addContractSign: jest.fn(),
}));

const userGroups = ['group'];
jest.mock('src/shared/utils/user-group.utils', () => ({
  convertUserToGroups: jest.fn().mockImplementation(() => userGroups),
}));

jest.mock('../../utils/location-flow.util', () => ({
  clearLocationsVotes: jest.fn(),
}));

jest.mock('../../utils/add-fdpg-task.util', () => ({
  addFdpgTaskAndReturnId: jest.fn(),
}));

describe('ProposalContractingService', () => {
  let proposalContractingService: ProposalContractingService;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let eventEngineService: jest.Mocked<EventEngineService>;
  let storageService: jest.Mocked<StorageService>;
  let statusChangeService: jest.Mocked<StatusChangeService>;
  let proposalUploadService: jest.Mocked<ProposalUploadService>;
  let locationService: jest.Mocked<LocationService>;

  const request = {
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

  const mockLookup = {
    'loc-1': { _id: 'loc-1', name: 'Location 1' },
  };

  const proposalId = 'proposalId';
  const proposalContent = {
    _id: proposalId,
    projectAbbreviation: 'projectAbbreviation',
    status: ProposalStatus.LocationCheck,
  };
  const getProposalDocument = () => {
    const proposalDocument = {
      ...proposalContent,
      save: jest.fn().mockImplementation(function () {
        return JSON.parse(JSON.stringify(this));
      }),
    };
    return proposalDocument as any as ProposalDocument;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalContractingService,
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: EventEngineService,
          useValue: {
            handleProposalDizApproval: jest.fn(),
            handleProposalUacApproval: jest.fn(),
            handleProposalStatusChange: jest.fn(),
            handleProposalContractSign: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: StatusChangeService,
          useValue: {
            handleEffects: jest.fn(),
          },
        },
        {
          provide: ProposalUploadService,
          useValue: {
            handleEffects: jest.fn(),
            deleteUpload: jest.fn(),
          },
        },
        {
          provide: LocationService,
          useValue: {
            findAllLookUpMap: jest.fn().mockResolvedValue(mockLookup),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalContractingService = module.get<ProposalContractingService>(ProposalContractingService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    eventEngineService = module.get<EventEngineService>(EventEngineService) as jest.Mocked<EventEngineService>;
    storageService = module.get<StorageService>(StorageService) as jest.Mocked<StorageService>;
    statusChangeService = module.get<StatusChangeService>(StatusChangeService) as jest.Mocked<StatusChangeService>;
    proposalUploadService = module.get<ProposalUploadService>(
      ProposalUploadService,
    ) as jest.Mocked<ProposalUploadService>;
    locationService = module.get<LocationService>(LocationService) as jest.Mocked<LocationService>;
  });

  it('should be defined', () => {
    expect(proposalContractingService).toBeDefined();
  });

  describe('setDizApproval', () => {
    it('should set the diz approval', async () => {
      const proposalDocument = getProposalDocument();
      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalDocument);

      const vote = {
        value: true,
      } as SetDizApprovalDto;

      await proposalContractingService.setDizApproval(proposalId, vote, request.user);

      expect(validateDizApproval).toHaveBeenCalledWith(proposalDocument, request.user);
      expect(addDizApproval).toHaveBeenCalledWith(proposalDocument, request.user, vote);
      expect(addHistoryItemForDizApproval).toHaveBeenCalledWith(proposalDocument, request.user, vote.value);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalDizApproval).toHaveBeenCalledWith(
        proposalContent,
        vote.value,
        request.user.miiLocation,
      );
    });
  });

  describe('setUacApproval', () => {
    test.each([true, false])('should set the uac approval', async (withFile: boolean) => {
      const file = withFile ? ({ buffer: 'buffer' } as any as Express.Multer.File) : undefined;
      const proposalDocument = getProposalDocument();
      const vote = {
        value: true,
        dataAmount: 1234,
      } as SetUacApprovalDto;

      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalDocument);

      await proposalContractingService.setUacApproval(proposalId, vote, file, request.user);

      expect(validateUacApproval).toHaveBeenCalledWith(proposalDocument, request.user);
      expect(addHistoryItemForUacApproval).toHaveBeenCalledWith(proposalDocument, request.user, vote.value, withFile);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalUacApproval).toHaveBeenCalledWith(
        proposalContent,
        vote.value,
        request.user.miiLocation,
      );

      if (withFile) {
        expect(addUpload).toHaveBeenCalledWith(proposalDocument, expect.objectContaining({ blobName: 'blobName' }));
        expect(addUacApprovalWithCondition).toHaveBeenCalledWith(
          proposalDocument,
          request.user,
          vote,
          expect.objectContaining({ blobName: 'blobName' }),
          undefined,
        );
        expect(storageService.uploadFile).toHaveBeenCalledWith('blobName', file, request.user);
      } else {
        expect(addUacApprovalWithCondition).toHaveBeenCalledWith(
          proposalDocument,
          request.user,
          vote,
          undefined,
          undefined,
        );
      }
    });
  });

  describe('revertLocationVote', () => {
    it('should revert the location vote', async () => {
      const proposalDocument = getProposalDocument();
      const location = 'UKL';
      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalDocument);

      await proposalContractingService.revertLocationVote(proposalId, request.user.miiLocation, request.user);

      expect(validateRevertLocationVote).toHaveBeenCalledWith(proposalDocument, location, request.user);
      expect(revertLocationVote).toHaveBeenCalledWith(
        proposalDocument,
        request.user.miiLocation,
        request.user,
        proposalUploadService,
      );
      expect(addHistoryItemForRevertLocationVote).toHaveBeenCalledWith(
        proposalDocument,
        request.user,
        request.user.miiLocation,
      );
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('initContracting', () => {
    test.each([true, false])('should init the contracting', async (isValidStatus: boolean) => {
      const proposalStatus = isValidStatus ? ProposalStatus.LocationCheck : ProposalStatus.Draft;
      const proposalDocument = { ...getProposalDocument(), status: proposalStatus } as any as ProposalDocument;
      const expectedDocument = { ...proposalDocument, status: ProposalStatus.Contracting };

      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalDocument);
      const file = { buffer: 'buffer' } as any as Express.Multer.File;
      const selectedLocations = { locations: ['MRI'] } as any as InitContractingDto;

      await proposalContractingService.initContracting(proposalId, file, selectedLocations, request.user);

      expect(validateStatusChange).toHaveBeenCalledWith(
        proposalDocument,
        ProposalStatus.Contracting,
        request.user,
        !isValidStatus,
      );
      expect(storageService.uploadFile).toHaveBeenCalledWith('blobName', file, request.user);
      expect(addUpload).toHaveBeenCalledWith(proposalDocument, expect.objectContaining({ blobName: 'blobName' }));
      expect(statusChangeService.handleEffects).toHaveBeenCalledWith(expectedDocument, proposalStatus, request.user, [
        'MRI',
      ]);
      expect(addHistoryItemForStatus).toHaveBeenCalledWith(expectedDocument, request.user, proposalStatus);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalStatusChange).toHaveBeenCalledWith(
        JSON.parse(JSON.stringify(expectedDocument)),
      );
    });
  });

  describe('signContract', () => {
    test.each([true, false])('should sign the contract', async (decision: boolean) => {
      const proposalDocument = getProposalDocument();
      const vote = {
        value: decision,
      } as SignContractDto;

      const file = { buffer: 'buffer' } as any as Express.Multer.File;

      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalDocument);

      await proposalContractingService.signContract(proposalId, vote, file, request.user);

      expect(validateContractSign).toHaveBeenCalledWith(proposalDocument, request.user, vote, file);
      expect(addContractSign).toHaveBeenCalledWith(proposalDocument, vote, request.user);

      expect(addHistoryItemForContractSign).toHaveBeenCalledWith(proposalDocument, request.user, vote.value);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalContractSign).toHaveBeenCalledWith(
        JSON.parse(JSON.stringify(proposalDocument)),
        vote.value,
        request.user,
      );
    });
  });

  describe('markConditionAsAccepted', () => {
    const conditionId = 'conditionId';
    const testCases = [
      {
        condition: {
          _id: { toString: () => 'conditionId' },
          reviewedAt: undefined,
        },
        shouldThrow: undefined,
      },
      {
        condition: {
          _id: { toString: () => 'otherConditionId' },
          reviewedAt: new Date(),
        },
        shouldThrow: NotFoundException,
      },
      {
        condition: {
          _id: { toString: () => 'conditionId' },
          reviewedAt: new Date(),
        },
        shouldThrow: ForbiddenException,
      },
    ];
    test.each(testCases)('should mark the condition as accepted', async (testCase) => {
      const proposalDocument = {
        ...getProposalDocument(),
        save: jest.fn().mockImplementation(function () {
          return {
            ...this,
            toObject: jest.fn().mockReturnValue(this),
          };
        }),
      } as any as ProposalDocument;

      const proposalWithConditions = {
        ...proposalDocument,
        conditionalApprovals: [testCase.condition],
      } as any as ProposalDocument;
      const isAccepted = true;
      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalWithConditions);

      if (testCase.shouldThrow) {
        const serviceCall = proposalContractingService.markUacConditionAsAccepted(
          proposalId,
          conditionId,
          isAccepted,
          request.user,
        );
        const error = await getError(async () => await serviceCall);

        expect(error).toBeDefined();
        expect(error).not.toBeInstanceOf(NoErrorThrownError);
        expect(error).toBeInstanceOf(testCase.shouldThrow);
      } else {
        await proposalContractingService.markUacConditionAsAccepted(proposalId, conditionId, isAccepted, request.user);
        expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('updateContract', () => {
    it('should update the contract', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        status: ProposalStatus.Contracting,
      } as any as ProposalDocument;
      const contractDraftReplaceId = 'contractDraftReplaceId';

      const file = { buffer: 'buffer' } as any as Express.Multer.File;

      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalDocument);

      await proposalContractingService.updateContractDraft(proposalId, file, contractDraftReplaceId, request.user);

      expect(proposalUploadService.deleteUpload).toHaveBeenCalledWith(
        proposalDocument,
        contractDraftReplaceId,
        request.user,
      );
      expect(addUpload).toHaveBeenCalledTimes(1);
      expect(addHistoryItemForContractUpdate).toHaveBeenCalledTimes(1);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
    });

    it('should throw', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        status: ProposalStatus.FdpgCheck,
      } as any as ProposalDocument;
      const contractDraftReplaceId = 'contractDraftReplaceId';

      const file = { buffer: 'buffer' } as any as Express.Multer.File;

      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposalDocument);

      await expect(
        proposalContractingService.updateContractDraft(proposalId, file, contractDraftReplaceId, request.user),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('skipContract', () => {
    describe('addContractSkip', () => {
      const loc1 = 'loc-1';
      const loc2 = 'loc-2';

      let mockProposal: any;

      beforeEach(() => {
        mockProposal = {
          uacApprovals: [
            { location: loc1, dataAmount: 100, isContractSigned: false },
            { location: loc2, dataAmount: 200, isContractSigned: false },
          ],
          conditionalApprovals: [],
          signedContracts: [],
          uacApprovedLocations: [loc1, loc2],
          totalContractedDataAmount: 0,
          statusChangeToLocationContractingAt: null,
        };
      });

      it('should update proposal-level contract flags', () => {
        addContractSkip(mockProposal, [loc1], request.user);

        expect(mockProposal.statusChangeToLocationContractingAt).toBeInstanceOf(Date);
        expect(mockProposal.contractRejectedByResearcher).toBe(false);
        expect(mockProposal.contractAcceptedByResearcher).toBe(true);
        expect(mockProposal.contractingSkipped).toBe(true);
      });

      it('should sign specific location, update data amount, and clear votes', () => {
        addContractSkip(mockProposal, [loc1], request.user);

        const modifiedVote = mockProposal.uacApprovals.find((v) => v.location === loc1 && v.isContractSigned === true);

        expect(modifiedVote).toBeDefined();
        expect(modifiedVote.signedByOwnerId).toBe(request.user.userId);
        expect(modifiedVote.signedAt).toBeInstanceOf(Date);
        expect(modifiedVote.isContractSigned).toBe(true);

        expect(clearLocationsVotes).toHaveBeenCalledWith(mockProposal, loc1);

        expect(mockProposal.signedContracts).toContain(loc1);

        expect(mockProposal.totalContractedDataAmount).toBe(100);
      });

      it('should handle multiple locations', () => {
        addContractSkip(mockProposal, [loc1, loc2], request.user);

        expect(mockProposal.signedContracts).toEqual(expect.arrayContaining([loc1, loc2]));
        expect(mockProposal.totalContractedDataAmount).toBe(300); // 100 + 200
        expect(clearLocationsVotes).toHaveBeenCalledTimes(2);
      });

      it('should use conditionalApprovals if uacApprovals missing', () => {
        const conditionalLoc = 'loc-cond';
        const condVote = { location: conditionalLoc, dataAmount: 50 };

        mockProposal.uacApprovals = [];
        mockProposal.conditionalApprovals = [condVote];
        mockProposal.uacApprovedLocations = [conditionalLoc];

        addContractSkip(mockProposal, [conditionalLoc], request.user);

        expect(mockProposal.signedContracts).toContain(conditionalLoc);
        expect(mockProposal.totalContractedDataAmount).toBe(50);
        expect(mockProposal.uacApprovals).toContain(condVote);
      });

      it('should complete contracting if all locations processed', () => {
        mockProposal.uacApprovedLocations = [];

        addContractSkip(mockProposal, [loc1], request.user);

        expect(mockProposal.isContractingComplete).toBe(true);
        expect(addFdpgTaskAndReturnId).toHaveBeenCalledWith(mockProposal, FdpgTaskType.ContractComplete);
      });
    });

    describe('validateLocation(s)', () => {
      describe('validateLocation', () => {
        it('should resolve if location exists', async () => {
          await expect(validateLocation(locationService, 'loc-1')).resolves.not.toThrow();
        });

        it('should throw NotFoundException if location missing', async () => {
          await expect(validateLocation(locationService, 'loc-99')).rejects.toThrow(NotFoundException);
        });
      });

      describe('validateLocations', () => {
        it('should resolve if all locations exist', async () => {
          await expect(validateLocations(locationService, ['loc-1'])).resolves.not.toThrow();
        });

        it('should throw if any location is missing', async () => {
          await expect(validateLocations(locationService, ['loc-1', 'loc-99'])).rejects.toThrow(NotFoundException);
        });
      });
    });
  });
});
