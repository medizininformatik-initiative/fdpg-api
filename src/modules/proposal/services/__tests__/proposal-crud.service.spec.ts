import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { Role } from 'src/shared/enums/role.enum';
import { SharedService } from 'src/shared/shared.service';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalCreateDto, ProposalGetDto, ProposalUpdateDto } from '../../dto/proposal/proposal.dto';
import { Proposal, ProposalDocument } from '../../schema/proposal.schema';
import { ProposalCrudService } from '../proposal-crud.service';
import { StatusChangeService } from '../status-change.service';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { addHistoryItemForStatus } from '../../utils/proposal-history.util';
import { validateProposalAccess } from '../../utils/validate-access.util';
import { NoErrorThrownError, getError } from 'test/get-error';
import { NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { ProposalValidation } from '../../enums/porposal-validation.enum';
import { SortOrderDto } from 'src/shared/dto/sort-order.dto';
import { PanelQuery } from '../../enums/panel-query.enum';
import { FilterQuery } from 'mongoose';
import { OrderDirection } from 'src/shared/constants/global.constants';
import { GetListProjection } from '../../schema/constants/get-list.projection';
import { validateMatchingId } from 'src/shared/utils/validate-matching-ids.util';
import { validateStatusChange } from '../../utils/validate-status-change.util';
import { CheckUniqueProposalDto } from '../../dto/check-unique-proposal.dto';

class ProposalModel {
  constructor(data) {
    if (data) {
      Object.assign(this, data);
    }
  }
  save = jest.fn().mockImplementation(() => {
    return {
      ...JSON.parse(JSON.stringify(this)),
      toObject: jest.fn().mockImplementation(() => JSON.parse(JSON.stringify(this))),
    };
  });
  static find = jest.fn();
  static findById = jest.fn();
  static findOne = jest.fn();
  static findOneAndUpdate = jest.fn();
  static deleteOne = jest.fn();
  static exists = jest.fn();
}

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn().mockImplementation((cls, plain, options) => plain),
  };
});

jest.mock('../../utils/proposal-history.util', () => ({
  addHistoryItemForStatus: jest.fn(),
}));

jest.mock('src/shared/utils/get-owner.util', () => ({
  getOwner: jest.fn().mockImplementation((user) => 'user'),
}));

jest.mock('../../utils/validate-access.util', () => ({
  validateProposalAccess: jest.fn().mockImplementation(() => true),
}));

const userGroups = ['group'];
jest.mock('src/shared/utils/user-group.utils', () => ({
  convertUserToGroups: jest.fn().mockImplementation(() => userGroups),
}));

const filterQueryResult = { status: ProposalStatus.Draft } as FilterQuery<Proposal>;
jest.mock('../../utils/proposal-filter/proposal-filter.util', () => ({
  getProposalFilter: jest.fn().mockImplementation(() => filterQueryResult),
}));

jest.mock('src/shared/utils/validate-matching-ids.util', () => ({
  validateMatchingId: jest.fn(),
}));

jest.mock('../../utils/validate-status-change.util', () => ({
  validateStatusChange: jest.fn(),
}));

jest.mock('../../utils/merge-proposal.util', () => ({
  mergeProposal: jest.fn(),
}));

describe('ProposalCrudService', () => {
  let proposalCrudService: ProposalCrudService;
  let model: Model<ProposalDocument>;

  let eventEngineService: jest.Mocked<EventEngineService>;
  let sharedService: jest.Mocked<SharedService>;
  let statusChangeService: jest.Mocked<StatusChangeService>;

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
      isFromLocation: false,
      isKnownLocation: false,
    },
  } as FdpgRequest;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalCrudService,
        {
          provide: getModelToken(Proposal.name),
          useValue: ProposalModel,
        },
        {
          provide: EventEngineService,
          useValue: {
            handleProposalStatusChange: jest.fn(),
          },
        },
        {
          provide: SharedService,
          useValue: {
            deleteProposalWithDependencies: jest.fn(),
          },
        },
        {
          provide: StatusChangeService,
          useValue: {
            handleEffects: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    model = module.get<Model<ProposalDocument>>(getModelToken(Proposal.name));

    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService);
    eventEngineService = module.get<EventEngineService>(EventEngineService) as jest.Mocked<EventEngineService>;
    sharedService = module.get<SharedService>(SharedService) as jest.Mocked<SharedService>;
    statusChangeService = module.get<StatusChangeService>(StatusChangeService) as jest.Mocked<StatusChangeService>;
  });

  it('should be defined', () => {
    expect(proposalCrudService).toBeDefined();
  });

  describe('create', () => {
    it('should create a proposal', async () => {
      const proposal = {
        projectAbbreviation: 'test',
        status: ProposalStatus.Draft,
      } as any;

      const createDto = proposal as ProposalCreateDto;

      const result = await proposalCrudService.create(createDto, request.user);

      expect(addHistoryItemForStatus).toBeCalledWith(
        expect.objectContaining({ projectAbbreviation: proposal.projectAbbreviation }),
        request.user,
      );

      expect(statusChangeService.handleEffects).toBeCalledWith(
        expect.objectContaining({ projectAbbreviation: proposal.projectAbbreviation }),
        null,
        request.user,
      );

      expect(result.version).toEqual({ mayor: 0, minor: 0 });
      expect(result.status).toEqual(proposal.status);
      expect(result.ownerName).toEqual(request.user.fullName);
      expect(result.owner).toEqual('user');
      expect(result.projectAbbreviation).toEqual(proposal.projectAbbreviation);
    });

    it('should handle status change effects if not draft', async () => {
      const proposal = {
        projectAbbreviation: 'test',
        status: ProposalStatus.FdpgCheck,
      } as any;

      const createDto = proposal as ProposalCreateDto;

      const result = await proposalCrudService.create(createDto, request.user);

      expect(eventEngineService.handleProposalStatusChange).toBeCalledWith(
        expect.objectContaining({ projectAbbreviation: proposal.projectAbbreviation }),
      );

      expect(result.status).toEqual(proposal.status);
    });
  });

  describe('findDocument', () => {
    it('should find a proposal without projection', async () => {
      const proposalId = 'proposalId';
      const desiredProjection = undefined;
      const expectedProjection = { ['reports.content']: 0 };
      const willBeModified = false;

      const proposal = { _id: proposalId } as any as ProposalDocument;
      ProposalModel.findById.mockResolvedValueOnce(proposal);

      const result = await proposalCrudService.findDocument(
        proposalId,
        request.user,
        desiredProjection,
        willBeModified,
      );
      expect(result).toEqual(proposal);
      expect(ProposalModel.findById).toBeCalledWith(proposalId, expectedProjection);
      expect(validateProposalAccess).toBeCalledWith(proposal, request.user, willBeModified);
    });

    it('should find a proposal with projection', async () => {
      const proposalId = 'proposalId';
      const expectedProjection = { ['reports.content']: 1, owner: 1 };
      const desiredProjection = { ['reports.content']: 1 };
      const willBeModified = true;

      const proposal = { _id: proposalId, owner: { name: 'Lars' } } as any as ProposalDocument;
      const proposalWithOwner = { ...proposal, owner: { name: 'Lars' } } as any as ProposalDocument;
      ProposalModel.findById.mockResolvedValueOnce(proposalWithOwner);

      const result = await proposalCrudService.findDocument(
        proposalId,
        request.user,
        desiredProjection,
        willBeModified,
      );
      expect(result).toEqual(proposal);
      expect(ProposalModel.findById).toBeCalledWith(proposalId, expectedProjection);
      expect(validateProposalAccess).toBeCalledWith(proposal, request.user, willBeModified);
    });

    it('should find a proposal with diz member projection', async () => {
      const proposalId = 'proposalId';
      const user = { ...request.user, singleKnownRole: Role.DizMember };
      const expectedProjection = {
        ['reports.content']: 1,
        owner: 1,
        conditionalApprovals: 1,
        locationConditionDraft: 1,
        openDizChecks: 1,
        dizApprovedLocations: 1,
        uacApprovedLocations: 1,
        openDizConditionChecks: 1,
        signedContracts: 1,
        requestedButExcludedLocations: 1,
      };
      const desiredProjection = { ['reports.content']: 1 };
      const willBeModified = true;

      const proposal = { _id: proposalId, owner: { name: 'Lars' } } as any as ProposalDocument;
      const proposalWithOwner = { ...proposal, owner: { name: 'Lars' } } as any as ProposalDocument;
      ProposalModel.findById.mockResolvedValueOnce(proposalWithOwner);

      const result = await proposalCrudService.findDocument(proposalId, user, desiredProjection, willBeModified);
      expect(result).toEqual(proposal);
      expect(ProposalModel.findById).toBeCalledWith(proposalId, expectedProjection);
      expect(validateProposalAccess).toBeCalledWith(proposal, user, willBeModified);
    });

    it('should find a proposal with uac member projection', async () => {
      const proposalId = 'proposalId';
      const user = { ...request.user, singleKnownRole: Role.UacMember };
      const expectedProjection = {
        ['reports.content']: 1,
        owner: 1,
        conditionalApprovals: 1,
        dizApprovedLocations: 1,
        locationConditionDraft: 1,
        openDizConditionChecks: 1,
        uacApprovedLocations: 1,
        signedContracts: 1,
        requestedButExcludedLocations: 1,
      };
      const desiredProjection = { ['reports.content']: 1 };
      const willBeModified = true;

      const proposal = { _id: proposalId, owner: { name: 'Lars' } } as any as ProposalDocument;
      const proposalWithOwner = { ...proposal, owner: { name: 'Lars' } } as any as ProposalDocument;
      ProposalModel.findById.mockResolvedValueOnce(proposalWithOwner);

      const result = await proposalCrudService.findDocument(proposalId, user, desiredProjection, willBeModified);
      expect(result).toEqual(proposal);
      expect(ProposalModel.findById).toBeCalledWith(proposalId, expectedProjection);
      expect(validateProposalAccess).toBeCalledWith(proposal, user, willBeModified);
    });

    it('should throw 404 if not found', async () => {
      const proposalId = 'proposalId';
      const desiredProjection = undefined;
      const willBeModified = false;

      ProposalModel.findById.mockResolvedValueOnce(undefined);

      const serviceCall = proposalCrudService.findDocument(proposalId, request.user, desiredProjection, willBeModified);

      const error = await getError(async () => await serviceCall);

      expect(error).toBeDefined();
      expect(error).not.toBeInstanceOf(NoErrorThrownError);
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('find', () => {
    it('should find a proposal', async () => {
      const proposalId = 'proposalId';
      const proposalContent = { _id: proposalId } as any;
      const proposal = { ...proposalContent, toObject: () => proposalContent } as any as ProposalDocument;
      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposal);

      const result = await proposalCrudService.find(proposalId, request.user);

      const plainToClassConfig = {
        strategy: 'excludeAll',
        groups: [...userGroups, ProposalValidation.IsOutput, request.user.singleKnownRole],
      };
      expect(plainToClass).toBeCalledWith(ProposalGetDto, proposalContent, plainToClassConfig);

      expect(result).toEqual(proposalContent);
    });
  });

  describe('findAll', () => {
    it('should find all proposals', async () => {
      const sortOrder = {
        order: OrderDirection.ASC,
        sortBy: 'projectAbbreviation',
      } as SortOrderDto;

      const panelQuery = PanelQuery.Draft;

      const proposalId = 'proposalId';
      const proposal = {
        _id: proposalId,
        ownerName: 'ownerName',
        userProject: { generalProjectInformation: { projectTitle: 'Title' } },
      } as any as ProposalDocument;
      ProposalModel.find.mockResolvedValueOnce([proposal]);

      const result = await proposalCrudService.findAll(sortOrder, panelQuery, request.user);

      expect(ProposalModel.find).toBeCalledWith(filterQueryResult, null, {
        sort: { [sortOrder.sortBy]: sortOrder.order },
        projection: GetListProjection,
      });
    });
  });

  describe('update', () => {
    test.each([ProposalStatus.Draft, ProposalStatus.FdpgCheck])(
      'should update a proposal with same status or different status',
      async (proposalStatus: ProposalStatus.Draft | ProposalStatus.FdpgCheck) => {
        const proposalId = 'proposalId';
        const proposalUpdate = { _id: proposalId, status: proposalStatus } as any as ProposalUpdateDto;

        const saveResult = {
          toObject: jest.fn().mockReturnValue(proposalUpdate),
        };
        const toBeUpdated = {
          _id: proposalId,
          status: ProposalStatus.Draft,
          save: jest.fn().mockReturnValue(saveResult),
        } as any as ProposalDocument;
        jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(toBeUpdated);

        const result = await proposalCrudService.update(proposalId, proposalUpdate, request.user);

        expect(validateMatchingId).toBeCalledWith(proposalId, proposalUpdate._id);

        expect(statusChangeService.handleEffects).toBeCalledWith(
          expect.objectContaining(toBeUpdated),
          toBeUpdated.status,
          request.user,
        );

        expect(result).toEqual(proposalUpdate);

        if (proposalStatus === ProposalStatus.Draft) {
          expect(validateStatusChange).not.toBeCalledWith(toBeUpdated, proposalUpdate.status, request.user);
          expect(eventEngineService.handleProposalStatusChange).not.toBeCalled();
        } else {
          expect(validateStatusChange).toBeCalledWith(toBeUpdated, proposalUpdate.status, request.user);
          expect(eventEngineService.handleProposalStatusChange).toBeCalledWith(saveResult);
        }
      },
    );
  });

  describe('delete', () => {
    it('should delete a proposal', async () => {
      const proposalId = 'proposalId';
      const proposal = { _id: proposalId } as any as ProposalDocument;
      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposal);

      await proposalCrudService.delete(proposalId, request.user);

      expect(sharedService.deleteProposalWithDependencies).toBeCalledWith(proposal, request.user);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a proposal', async () => {
      const proposalId = 'proposalId';
      const proposalContent = { _id: proposalId, status: ProposalStatus.FdpgCheck, projectAbbreviation: 'test' } as any;
      const expectedProposal = {
        ...proposalContent,
        status: ProposalStatus.Draft,
        projectAbbreviation: 'test-Copy(2)',
      } as any;
      const proposal = {
        ...proposalContent,
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as ProposalDocument;
      jest.spyOn(proposalCrudService, 'findDocument').mockResolvedValueOnce(proposal);
      jest.spyOn(proposalCrudService, 'checkUnique').mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      jest
        .spyOn(proposalCrudService, 'create')
        .mockImplementationOnce((toBeSaved, _user) => Promise.resolve(toBeSaved as any as ProposalGetDto));

      const result = await proposalCrudService.duplicate(proposalId, request.user);

      expect(proposalCrudService.checkUnique).toBeCalledTimes(2);
      expect(proposalCrudService.create).toBeCalledWith(expectedProposal, request.user);
      expect(result).toEqual(expectedProposal);
    });
  });

  describe('checkUnique', () => {
    test.each(['proposalId', undefined])('should check if proposal is unique', async (proposalId?: string) => {
      const checkUniqueProposalDto = { projectAbbreviation: 'projectAbbreviation' } as any as CheckUniqueProposalDto;
      ProposalModel.exists.mockResolvedValueOnce(true);

      const filter = {
        ...checkUniqueProposalDto,
      } as any;

      if (proposalId) {
        filter._id = { $ne: proposalId };
      }

      const result = await proposalCrudService.checkUnique(checkUniqueProposalDto, proposalId);

      expect(result).toEqual(false);
      expect(ProposalModel.exists).toBeCalledWith(filter);
    });
  });
});
