import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { PublicationCreateDto, PublicationGetDto, PublicationUpdateDto } from '../../dto/proposal/publication.dto';
import { ProposalPublicationController } from '../proposal-publication.controller';
import { ProposalPublicationService } from '../../services/proposal-publication.service';

const moduleMocker = new ModuleMocker(global);

describe('ProposalPublicationController', () => {
  let proposalPublicationController: ProposalPublicationController;
  let proposalPublicationService: ProposalPublicationService;

  const fdpgRequest = {
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

  const mongoTwoIdsParamDto = new MongoTwoIdsParamDto();
  mongoTwoIdsParamDto.mainId = 'mainId';
  mongoTwoIdsParamDto.subId = 'subId';

  const mongoIdParamDto = new MongoIdParamDto();
  mongoIdParamDto.id = 'id';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProposalPublicationController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    proposalPublicationService = moduleRef.get<ProposalPublicationService>(ProposalPublicationService);
    proposalPublicationController = moduleRef.get<ProposalPublicationController>(ProposalPublicationController);
  });

  describe('createPublication', () => {
    it('should create a publication and add it to the proposal', async () => {
      const publicationCreateDto = new PublicationCreateDto();
      const publicationGetDto = new PublicationGetDto();

      jest.spyOn(proposalPublicationService, 'createPublication').mockResolvedValueOnce([publicationGetDto]);

      const result = await proposalPublicationController.createPublication(
        mongoIdParamDto,
        publicationCreateDto,
        fdpgRequest,
      );

      expect(proposalPublicationService.createPublication).toHaveBeenCalledWith(
        mongoIdParamDto.id,
        publicationCreateDto,
        fdpgRequest.user,
      );
      expect(result).toEqual([publicationGetDto]);
    });
  });

  describe('getAllPublications', () => {
    it('should return publications for a proposal', async () => {
      const publicationGetDto = new PublicationGetDto();
      jest.spyOn(proposalPublicationService, 'getAllPublications').mockResolvedValueOnce([publicationGetDto]);

      const result = await proposalPublicationController.getAllPublications(mongoIdParamDto, fdpgRequest);

      expect(proposalPublicationService.getAllPublications).toHaveBeenCalledWith(mongoIdParamDto.id, fdpgRequest.user);
      expect(result).toEqual([publicationGetDto]);
    });
  });

  describe('updatePublication', () => {
    it('should update publications for a proposal', async () => {
      const publicationUpdateDto = new PublicationUpdateDto();
      const publicationGetDto = new PublicationGetDto();
      jest.spyOn(proposalPublicationService, 'updatePublication').mockResolvedValueOnce([publicationGetDto]);

      const result = await proposalPublicationController.updatePublication(
        mongoTwoIdsParamDto,
        publicationUpdateDto,
        fdpgRequest,
      );

      expect(proposalPublicationService.updatePublication).toHaveBeenCalledWith(
        mongoTwoIdsParamDto.mainId,
        mongoTwoIdsParamDto.subId,
        publicationUpdateDto,
        fdpgRequest.user,
      );

      expect(result).toEqual([publicationGetDto]);
    });
  });

  describe('deletePublication', () => {
    it('should update publications for a proposal', async () => {
      jest.spyOn(proposalPublicationService, 'deletePublication').mockResolvedValue();

      await proposalPublicationController.deletePublication(mongoTwoIdsParamDto, fdpgRequest);
      expect(proposalPublicationService.deletePublication).toHaveBeenCalledWith(
        mongoTwoIdsParamDto.mainId,
        mongoTwoIdsParamDto.subId,
        fdpgRequest.user,
      );
    });
  });
});
