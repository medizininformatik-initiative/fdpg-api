import { Test, TestingModule } from '@nestjs/testing';
import { ProposalDataDeliveryCrudService } from '../proposal-data-delivery-crud.service';
import { ProposalCrudService } from '../../proposal-crud.service';
import { getModelToken } from '@nestjs/mongoose';
import { Proposal } from '../../../schema/proposal.schema';
import { ProposalDataDeliveryMappingService } from '../proposal-data-delivery-mapping.service';
import { BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { DeliveryAcceptance } from '../../../enums/data-delivery.enum';
import { DeliveryInfoStatus } from '../../../enums/delivery-info-status.enum';

describe('ProposalDataDeliveryCrudService', () => {
  let service: ProposalDataDeliveryCrudService;
  let proposalCrudService: ProposalCrudService;
  let mappingService: ProposalDataDeliveryMappingService;
  let proposalModel: any;

  const mockUser = { userId: 'user-1', roles: [] } as any;
  const mockProposalId = 'prop-1';

  // Mock Document structure including .save()
  const createMockProposalDoc = (data: any = {}) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, ...data.dataDelivery }), // Return self/modified
  });

  beforeEach(async () => {
    // Mock the Mongoose Model
    const mockModel = {
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalDataDeliveryCrudService,
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: ProposalDataDeliveryMappingService,
          useValue: {
            mapToDeliveryInfoModel: jest.fn(),
          },
        },
        {
          provide: getModelToken(Proposal.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<ProposalDataDeliveryCrudService>(ProposalDataDeliveryCrudService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService);
    mappingService = module.get<ProposalDataDeliveryMappingService>(ProposalDataDeliveryMappingService);
    proposalModel = module.get(getModelToken(Proposal.name));

    // Silence logger
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('getDataDelivery', () => {
    it('should return dataDelivery if present', async () => {
      const mockDelivery = { acceptance: DeliveryAcceptance.ACCEPTED };
      const mockDoc = { dataDelivery: mockDelivery };

      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.getDataDelivery(mockProposalId, mockUser);
      expect(result).toBe(mockDelivery);
      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(
        mockProposalId,
        mockUser,
        { dataDelivery: 1, history: 1 },
        false,
      );
    });

    it('should return null if dataDelivery is missing', async () => {
      const mockDoc = { dataDelivery: undefined };
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.getDataDelivery(mockProposalId, mockUser);
      expect(result).toBeNull();
    });
  });

  describe('createDataDelivery', () => {
    it('should throw BadRequestException if already exists', async () => {
      const mockDoc = createMockProposalDoc({ dataDelivery: {} });
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      await expect(
        service.createDataDelivery(mockProposalId, 'dms-1', DeliveryAcceptance.ACCEPTED, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new dataDelivery and save', async () => {
      const mockDoc = createMockProposalDoc({ dataDelivery: undefined });
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      await service.createDataDelivery(mockProposalId, 'dms-1', DeliveryAcceptance.ACCEPTED, mockUser);

      expect(mockDoc.dataDelivery).toBeDefined();
      expect(mockDoc.dataDelivery.dataManagementSite).toBe('dms-1');
      expect(mockDoc.dataDelivery.deliveryInfos).toEqual([]);
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('updateDataDelivery', () => {
    const updateDto = {
      dataManagementSite: 'dms-new',
      acceptance: DeliveryAcceptance.DENIED,
      deliveryInfos: [],
    };

    it('should throw NotFoundException if dataDelivery does not exist', async () => {
      const mockDoc = createMockProposalDoc({ dataDelivery: undefined });
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.updateDataDelivery(mockProposalId, updateDto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should update fields and save', async () => {
      const existingDelivery = { createdAt: new Date('2023-01-01') };
      const mockDoc = createMockProposalDoc({ dataDelivery: existingDelivery });

      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);
      (mappingService.mapToDeliveryInfoModel as jest.Mock).mockReturnValue(['mapped-info']);

      await service.updateDataDelivery(mockProposalId, updateDto, mockUser);

      expect(mappingService.mapToDeliveryInfoModel).toHaveBeenCalledWith(updateDto.deliveryInfos);
      expect(mockDoc.dataDelivery.dataManagementSite).toBe('dms-new');
      expect(mockDoc.dataDelivery.deliveryInfos).toEqual(['mapped-info']);
      // Should preserve existing createdAt
      expect(mockDoc.dataDelivery.createdAt).toEqual(existingDelivery.createdAt);
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('updateDeliveryInfo', () => {
    const mockDeliveryInfo = { _id: 'd1', status: 'PENDING' } as any;

    it('should update using findOneAndUpdate and return doc', async () => {
      const mockUpdatedDoc = { _id: mockProposalId };

      // Mock chain: findOneAndUpdate({...}).exec() -> result
      proposalModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedDoc),
      });

      const result = await service.updateDeliveryInfo(mockProposalId, mockDeliveryInfo);

      expect(proposalModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockProposalId, 'dataDelivery.deliveryInfos._id': mockDeliveryInfo._id },
        {
          $set: {
            'dataDelivery.deliveryInfos.$': mockDeliveryInfo,
            'dataDelivery.updatedAt': expect.any(Date),
          },
        },
        { new: true, runValidators: true },
      );
      expect(result).toBe(mockUpdatedDoc);
    });

    it('should throw ForbiddenException if doc not found', async () => {
      proposalModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateDeliveryInfo(mockProposalId, mockDeliveryInfo)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findDeliveryInfoByProposalId / findDeliveryInfoInProposal', () => {
    it('should find nested delivery info', async () => {
      const mockInfo = { _id: 'd1' };
      const mockDoc = {
        dataDelivery: {
          deliveryInfos: [mockInfo, { _id: 'd2' }],
        },
      };

      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.findDeliveryInfoByProposalId(mockProposalId, 'd1', mockUser);

      expect(result).toEqual(mockInfo);
    });

    it('should return null if delivery info not found', async () => {
      const mockDoc = { dataDelivery: { deliveryInfos: [] } };
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.findDeliveryInfoByProposalId(mockProposalId, 'd99', mockUser);

      expect(result).toBeNull();
    });
  });

  describe('getProposalsWithDeliveriesByStatus', () => {
    it('should return list of proposals', async () => {
      const mockList = [{ _id: 'p1' }];
      proposalModel.find.mockResolvedValue(mockList);

      const result = await service.getProposalsWithDeliveriesByStatus(DeliveryInfoStatus.PENDING);

      expect(proposalModel.find).toHaveBeenCalledWith({
        'dataDelivery.deliveryInfos': {
          $elemMatch: { status: DeliveryInfoStatus.PENDING },
        },
      });
      expect(result).toBe(mockList);
    });
  });

  describe('createDeliveryInfo', () => {
    const newInfo = { _id: 'new-1', status: 'PENDING' } as any;

    it('should push new info via findOneAndUpdate', async () => {
      const mockUpdatedDoc = { _id: mockProposalId };
      proposalModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedDoc),
      });

      const result = await service.createDeliveryInfo(mockProposalId, newInfo);

      expect(proposalModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockProposalId },
        {
          $push: { 'dataDelivery.deliveryInfos': newInfo },
          $set: { 'dataDelivery.updatedAt': expect.any(Date) },
        },
        { new: true, runValidators: true },
      );
      expect(result).toBe(mockUpdatedDoc);
    });

    it('should throw ForbiddenException if doc not found', async () => {
      proposalModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.createDeliveryInfo(mockProposalId, newInfo)).rejects.toThrow(ForbiddenException);
    });
  });
});
