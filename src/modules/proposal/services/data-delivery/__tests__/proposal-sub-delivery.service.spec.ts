import { Test, TestingModule } from '@nestjs/testing';
import { ProposalSubDeliveryService } from '../proposal-sub-delivery.service';
import { getModelToken } from '@nestjs/mongoose';
import { Proposal } from '../../../schema/proposal.schema';
import { SubDeliveryStatus } from '../../../enums/data-delivery.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProposalSubDeliveryService', () => {
  let service: ProposalSubDeliveryService;
  let proposalModel: any;

  // Mock Data
  const mockProposalId = 'prop-1';
  const mockDeliveryId = 'del-1';
  const mockSubDeliveryId = 'sub-1';

  beforeEach(async () => {
    // Mock Mongoose Model
    const mockModel = {
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalSubDeliveryService,
        {
          provide: getModelToken(Proposal.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<ProposalSubDeliveryService>(ProposalSubDeliveryService);
    proposalModel = module.get(getModelToken(Proposal.name));

    jest.clearAllMocks();
  });

  describe('rateDelivery', () => {
    it('should throw BadRequestException if rating is invalid', async () => {
      // PENDING is usually an initial state, not a valid "Rating" action
      const invalidRating = SubDeliveryStatus.PENDING;

      await expect(
        service.rateDelivery(mockProposalId, mockDeliveryId, mockSubDeliveryId, invalidRating),
      ).rejects.toThrow(BadRequestException);

      expect(proposalModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if update returns null (proposal not found)', async () => {
      proposalModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.rateDelivery(mockProposalId, mockDeliveryId, mockSubDeliveryId, SubDeliveryStatus.ACCEPTED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update status to ACCEPTED using array filters', async () => {
      const mockUpdatedDoc = { _id: mockProposalId, status: 'updated' };
      proposalModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedDoc);

      const result = await service.rateDelivery(
        mockProposalId,
        mockDeliveryId,
        mockSubDeliveryId,
        SubDeliveryStatus.ACCEPTED,
      );

      // Verify the Mongoose Query
      expect(proposalModel.findByIdAndUpdate).toHaveBeenCalledWith(
        { _id: mockProposalId },
        {
          $set: {
            'dataDelivery.deliveryInfos.$[outer].subDeliveries.$[inner].status': SubDeliveryStatus.ACCEPTED,
          },
        },
        {
          arrayFilters: [{ 'outer._id': mockDeliveryId }, { 'inner._id': mockSubDeliveryId }],
          runValidators: true,
          new: true,
        },
      );

      expect(result).toBe(mockUpdatedDoc);
    });

    it('should successfully update status to REPEATED', async () => {
      const mockUpdatedDoc = { _id: mockProposalId };
      proposalModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedDoc);

      await service.rateDelivery(mockProposalId, mockDeliveryId, mockSubDeliveryId, SubDeliveryStatus.REPEATED);

      expect(proposalModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        {
          $set: {
            'dataDelivery.deliveryInfos.$[outer].subDeliveries.$[inner].status': SubDeliveryStatus.REPEATED,
          },
        },
        expect.any(Object),
      );
    });
  });
});
