import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { ProposalCrudService } from '../proposal-crud.service';

import { Test, TestingModule } from '@nestjs/testing';
import { ProposalPublicationService } from '../proposal-publication.service';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { Role } from 'src/shared/enums/role.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { PublicationCreateDto, PublicationUpdateDto } from '../../dto/proposal/publication.dto';
import { Publication } from '../../schema/sub-schema/publication.schema';
import { getAllPublicationsProjection } from '../../schema/constants/get-all-publications.projection';
import { getError } from 'test/get-error';
import { NotFoundException } from '@nestjs/common';

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn().mockImplementation((cls, plain, options) => plain),
  };
});

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
    miiLocation: MiiLocation.UKL,
    isFromLocation: false,
    isKnownLocation: true,
  },
} as FdpgRequest;

const proposalId = 'proposalId';

const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.FdpgCheck,
};

const getProposalDocument = () => {
  const proposalDocument = {
    ...proposalContent,
    publications: [],
    save: jest.fn().mockImplementation(function () {
      return {
        ...JSON.parse(JSON.stringify(this)),
        publications: this.publications.map((publication: any) => {
          return {
            ...publication,
            toObject: function () {
              return this;
            },
          };
        }),
      };
    }),
    set: jest.fn(),
  };
  return proposalDocument as any as ProposalDocument;
};

describe('ProposalPublicationService', () => {
  let proposalPublicationService: ProposalPublicationService;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let eventEngineService: jest.Mocked<EventEngineService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalPublicationService,
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: EventEngineService,
          useValue: {
            handleProposalPublicationCreate: jest.fn(),
            handleProposalPublicationUpdate: jest.fn(),
            handleProposalPublicationDelete: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalPublicationService = module.get<ProposalPublicationService>(ProposalPublicationService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    eventEngineService = module.get<EventEngineService>(EventEngineService) as jest.Mocked<EventEngineService>;
  });

  it('should be defined', () => {
    expect(proposalPublicationService).toBeDefined();
  });

  describe('createPublication', () => {
    it('should create a publication', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.publications = [];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);
      const publicationCreateDto = new PublicationCreateDto();
      publicationCreateDto.title = 'title';

      const result = await proposalPublicationService.createPublication(proposalId, publicationCreateDto, request.user);
      expect(result.length).toEqual(1);
      expect(result[0].title).toEqual(publicationCreateDto.title);
      expect(proposalDocument.publications).toEqual([
        {
          ...publicationCreateDto,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ]);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalPublicationCreate).toHaveBeenCalledWith(
        expect.objectContaining(proposalContent),
        publicationCreateDto,
      );
    });
  });

  describe('getAllPublications', () => {
    it('should get all publications', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        publications: [
          {
            title: 'title',
            toObject: function () {
              return this;
            },
          },
        ],
      } as any as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const result = await proposalPublicationService.getAllPublications(proposalId, request.user);
      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(
        proposalId,
        request.user,
        getAllPublicationsProjection,
        false,
      );
      expect(result.length).toEqual(1);
      expect(result[0].title).toEqual(proposalDocument.publications[0].title);
    });
  });

  describe('updatePublication', () => {
    it('should update a publication', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.publications = [
        {
          _id: 'publicationId',
          title: 'title',
        } as any as Publication,
      ];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);
      const publicationUpdateDto = new PublicationUpdateDto();
      publicationUpdateDto.title = 'title update';

      const result = await proposalPublicationService.updatePublication(
        proposalId,
        'publicationId',
        publicationUpdateDto,
        request.user,
      );

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user, undefined, true);
      expect(result.length).toEqual(1);
      expect(result[0].title).toEqual(publicationUpdateDto.title);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalPublicationUpdate).toHaveBeenCalledWith(
        proposalDocument,
        publicationUpdateDto,
      );
    });

    it('should throw if a publication is not found to be updated', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.publications = [
        {
          _id: 'publicationId',
          title: 'title',
        } as any as Publication,
      ];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);
      const publicationUpdateDto = new PublicationUpdateDto();
      publicationUpdateDto.title = 'title update';

      const call = proposalPublicationService.updatePublication(
        proposalId,
        'publicationIdNotExisting',
        publicationUpdateDto,
        request.user,
      );

      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(NotFoundException);

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user, undefined, true);

      expect(proposalDocument.save).not.toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalPublicationUpdate).not.toHaveBeenCalledWith(
        proposalDocument,
        publicationUpdateDto,
      );
    });
  });

  describe('deletePublication', () => {
    it('should delete a publication', async () => {
      const proposalDocument = getProposalDocument();
      const publication = {
        _id: 'publicationId',
        title: 'title',
      } as any as Publication;

      proposalDocument.publications = [publication];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      await proposalPublicationService.deletePublication(proposalId, 'publicationId', request.user);

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user, undefined, true);
      expect(proposalDocument.save).toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalPublicationDelete).toHaveBeenCalledWith(proposalDocument, publication);
    });

    it('should not save if a publication is not found to be deleted', async () => {
      const proposalDocument = getProposalDocument();
      const publication = {
        _id: 'publicationId',
        title: 'title',
      } as any as Publication;

      proposalDocument.publications = [publication];
      proposalCrudService.findDocument.mockResolvedValue(proposalDocument);

      const call = proposalPublicationService.deletePublication(proposalId, 'publicationIdNotExisting', request.user);

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user, undefined, true);

      expect(proposalDocument.save).not.toHaveBeenCalledTimes(1);
      expect(eventEngineService.handleProposalPublicationDelete).not.toHaveBeenCalledWith(
        proposalDocument,
        publication,
      );
    });
  });
});
