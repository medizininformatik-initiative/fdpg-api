import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { MarkAsDoneDto } from 'src/modules/comment/dto/mark-as-done.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { SetDizApprovalDto } from '../../dto/set-diz-approval.dto';
import { SetUacApprovalDto } from '../../dto/set-uac-approval.dto';
import { RevertLocationVoteDto } from '../../dto/revert-location-vote.dto';
import { SignContractDto } from '../../dto/sign-contract.dto';
import { ProposalContractingController } from '../proposal-contracting.controller';
import { ProposalContractingService } from '../../services/proposal-contracting.service';

const moduleMocker = new ModuleMocker(global);

describe('ProposalContractingController', () => {
  let proposalContractingController: ProposalContractingController;
  let proposalContractingService: ProposalContractingService;

  const request = {
    user: {
      userId: 'string',
      firstName: 'string',
      lastName: 'string',
      fullName: 'string',
      email: 'string',
      username: 'string',
      email_verified: true,
      roles: [Role.Researcher],
      singleKnownRole: Role.Researcher,
      isFromLocation: false,
      isKnownLocation: false,
    },
  } as FdpgRequest;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProposalContractingController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    proposalContractingService = moduleRef.get<ProposalContractingService>(ProposalContractingService);
    proposalContractingController = moduleRef.get<ProposalContractingController>(ProposalContractingController);
  });

  describe('setDizVote', () => {
    it('should set the diz vote', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new SetDizApprovalDto();
      jest.spyOn(proposalContractingService, 'setDizApproval');

      await proposalContractingController.setDizVote(params, input, request);
      expect(proposalContractingService.setDizApproval).toHaveBeenCalledWith(params.id, input, request.user);
    });
  });

  describe('setUacVote', () => {
    it('should set the uac vote', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new SetUacApprovalDto();
      const file: Express.Multer.File = { filename: 'test' } as Express.Multer.File;
      jest.spyOn(proposalContractingService, 'setUacApproval');

      await proposalContractingController.setUacVote(params, file, input, request);
      expect(proposalContractingService.setUacApproval).toHaveBeenCalledWith(params.id, input, file, request.user);
    });
  });

  describe('revertLocationVote', () => {
    it('should revert the location vote', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new RevertLocationVoteDto();
      jest.spyOn(proposalContractingService, 'handleLocationVote');

      await proposalContractingController.revertLocationVote(params, input, request);
      expect(proposalContractingService.handleLocationVote).toHaveBeenCalledWith(
        params.id,
        input.location,
        request.user,
      );
    });
  });

  describe('signContract', () => {
    it('should set the contract sign', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new SignContractDto();
      const file: Express.Multer.File = { filename: 'test' } as Express.Multer.File;
      jest.spyOn(proposalContractingService, 'signContract');

      await proposalContractingController.signContract(params, file, input, request);
      expect(proposalContractingService.signContract).toHaveBeenCalledWith(params.id, input, file, request.user);
    });
  });

  describe('markConditionAsAccepted', () => {
    it('should set the decision of contract condition', async () => {
      const params = {
        mainId: 'mainId-mongoId',
        subId: 'subId-mongoId',
      };
      const input = new MarkAsDoneDto();
      jest.spyOn(proposalContractingService, 'markUacConditionAsAccepted');

      await proposalContractingController.markConditionAsAccepted(params, input, request);
      expect(proposalContractingService.markUacConditionAsAccepted).toHaveBeenCalledWith(
        params.mainId,
        params.subId,
        input.value,
        request.user,
      );
    });
  });
});
