import { Test } from '@nestjs/testing';
import { SortOrderDto } from 'src/shared/dto/sort-order.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalFilterDto } from '../../dto/proposal-filter.dto';
import { ProposalGetDto, ProposalGetListDto, ProposalUpdateDto } from '../../dto/proposal/proposal.dto';
import { ProposalStatisticsDto } from '../../dto/proposal-statistics.dto';
import { ProposalCrudController } from '../proposal-crud.controller';
import { ProposalCrudService } from '../../services/proposal-crud.service';

describe('ProposalCrudController', () => {
  let proposalCrudController: ProposalCrudController;
  let proposalCrudService: ProposalCrudService;

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
      controllers: [ProposalCrudController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          return Object.fromEntries(
            Object.getOwnPropertyNames(token.prototype)
              .filter((key) => key !== 'constructor')
              .map((key) => [key, jest.fn()]),
          );
        }
      })
      .compile();

    proposalCrudService = moduleRef.get<ProposalCrudService>(ProposalCrudService);
    proposalCrudController = moduleRef.get<ProposalCrudController>(ProposalCrudController);
  });

  describe('create', () => {
    it('should return the created proposal', async () => {
      const dto = new ProposalGetDto();
      jest.spyOn(proposalCrudService, 'create').mockResolvedValue(dto);

      expect(await proposalCrudController.create(dto, request)).toBe(dto);
      expect(proposalCrudService.create).toHaveBeenCalledWith(dto, request.user);
    });
  });

  describe('find', () => {
    it('should return the proposal', async () => {
      const params = {
        id: 'mongoId',
      };
      const dto = new ProposalGetDto();
      jest.spyOn(proposalCrudService, 'find').mockResolvedValue(dto);

      expect(await proposalCrudController.find(params, request)).toBe(dto);
      expect(proposalCrudService.find).toHaveBeenCalledWith(params.id, request.user);
    });
  });

  describe('findAll', () => {
    it('should return all proposals', async () => {
      const sortOrder = new SortOrderDto();
      const proposalFilter = new ProposalFilterDto();
      const result = [{ some: 'thingToTest' }] as unknown as ProposalGetListDto[];
      jest.spyOn(proposalCrudService, 'findAll').mockResolvedValue(result);

      expect(await proposalCrudController.findAll(sortOrder, proposalFilter, request)).toBe(result);
      expect(proposalCrudService.findAll).toHaveBeenCalledWith(sortOrder, proposalFilter.panelQuery, request.user);
    });
  });

  describe('update', () => {
    it('should update the proposal', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = new ProposalUpdateDto();
      const result = new ProposalGetDto();
      jest.spyOn(proposalCrudService, 'update').mockResolvedValue(result);

      expect(await proposalCrudController.update(params, input, request)).toBe(result);
      expect(proposalCrudService.update).toHaveBeenCalledWith(params.id, input, request.user);
    });
  });

  describe('delete', () => {
    it('should delete the proposal', async () => {
      const params = {
        id: 'mongoId',
      };

      jest.spyOn(proposalCrudService, 'delete');

      await proposalCrudController.delete(params, request);
      expect(proposalCrudService.delete).toHaveBeenCalledWith(params.id, request.user);
    });
  });

  describe('duplicate', () => {
    it('should duplicate the proposal', async () => {
      const params = {
        id: 'mongoId',
      };

      const result = new ProposalGetDto();

      jest.spyOn(proposalCrudService, 'duplicate').mockResolvedValue(result);

      const call = proposalCrudController.duplicate(params, request);
      expect(await call).toBe(result);
      expect(proposalCrudService.duplicate).toHaveBeenCalledWith(params.id, request.user);
    });
  });

  describe('getStatistics', () => {
    it('should return proposal statistics', async () => {
      const result = {
        panels: {},
        total: 0,
      } as unknown as ProposalStatisticsDto;

      jest.spyOn(proposalCrudService, 'getStatistics').mockResolvedValue(result);

      const call = proposalCrudController.getStatistics(request);
      expect(await call).toBe(result);
      expect(proposalCrudService.getStatistics).toHaveBeenCalledWith(request.user);
    });
  });
});
