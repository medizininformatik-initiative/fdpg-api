import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { MarkAsDoneDto } from 'src/modules/comment/dto/mark-as-done.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { FdpgChecklistSetDto } from '../../dto/proposal/fdpg-checklist.dto';
import { ResearcherIdentityDto } from '../../dto/proposal/participants/researcher.dto';
import { SetProposalStatusDto } from '../../dto/set-status.dto';
import { ProposalMiscController } from '../proposal-misc.controller';
import { ProposalMiscService } from '../../services/proposal-misc.service';
import { SetFdpgCheckNotesDto } from '../../dto/set-fdpg-check-notes.dto';

const moduleMocker = new ModuleMocker(global);

describe('ProposalMiscController', () => {
  let proposalController: ProposalMiscController;
  let proposalMiscService: ProposalMiscService;

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
      controllers: [ProposalMiscController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    proposalMiscService = moduleRef.get<ProposalMiscService>(ProposalMiscService);
    proposalController = moduleRef.get<ProposalMiscController>(ProposalMiscController);
  });

  describe('getResearcherInfo', () => {
    it('should return the participating researcher info', async () => {
      const params = {
        id: 'mongoId',
      };
      const result = [{ some: 'thingToTest' }] as unknown as ResearcherIdentityDto[];
      jest.spyOn(proposalMiscService, 'getResearcherInfo').mockResolvedValue(result);

      expect(await proposalController.getResearcherInfo(params, request)).toBe(result);
      expect(proposalMiscService.getResearcherInfo).toHaveBeenCalledWith(params.id, request.user);
    });
  });

  describe('setStatus', () => {
    it('should set the status of the proposal', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new SetProposalStatusDto();
      jest.spyOn(proposalMiscService, 'setStatus');

      await proposalController.setStatus(params, input, request);
      expect(proposalMiscService.setStatus).toHaveBeenCalledWith(params.id, input.value, request.user);
    });
  });

  describe('setFdpgChecklist', () => {
    it('should set the fdpg checklist of the proposal', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new FdpgChecklistSetDto();
      jest.spyOn(proposalMiscService, 'setFdpgChecklist');

      await proposalController.setFdpgChecklist(params, input, request);
      expect(proposalMiscService.setFdpgChecklist).toHaveBeenCalledWith(params.id, input, request.user);
    });
  });

  describe('markSectionAsDone', () => {
    it('should mark a proposal section as done', async () => {
      const params = {
        mainId: 'mainId-mongoId',
        subId: 'subId-mongoId',
      };

      const input = new MarkAsDoneDto();

      jest.spyOn(proposalMiscService, 'markSectionAsDone');

      await proposalController.markSectionAsDone(params, input, request);
      expect(proposalMiscService.markSectionAsDone).toHaveBeenCalledWith(
        params.mainId,
        params.subId,
        input.value,
        request.user,
      );
    });
  });

  describe('setFdpgCheckNotes', () => {
    it('should set the fdpg checkNotes of the proposal', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new SetFdpgCheckNotesDto();
      jest.spyOn(proposalMiscService, 'setFdpgCheckNotes');

      await proposalController.setFdpgCheckNotes(params, input, request);
      expect(proposalMiscService.setFdpgCheckNotes).toHaveBeenCalledWith(params.id, input.value, request.user);
    });
  });
});
