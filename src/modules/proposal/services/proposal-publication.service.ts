import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { PublicationCreateDto, PublicationGetDto, PublicationUpdateDto } from '../dto/proposal/publication.dto';
import { ModificationContext } from '../enums/modification-context.enum';
import { ProposalCrudService } from './proposal-crud.service';
import { getAllPublicationsProjection } from '../schema/constants/get-all-publications.projection';
import { Publication, PublicationDocument } from '../schema/sub-schema/publication.schema';

@Injectable()
export class ProposalPublicationService {
  constructor(
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
  ) {}

  async createPublication(
    proposalId: string,
    publicationCreateDto: PublicationCreateDto,
    user: IRequestUser,
  ): Promise<PublicationGetDto[]> {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      undefined,
      true,
      ModificationContext.Publication,
    );

    proposal.publications = [
      ...proposal.publications,
      {
        ...publicationCreateDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const saveResult = await proposal.save();

    const allPublicationsReturn = saveResult.publications.map((publication: PublicationDocument) => {
      const plain = publication.toObject();
      return plainToClass(PublicationGetDto, plain, { strategy: 'excludeAll' });
    });

    await this.eventEngineService.handleProposalPublicationCreate(proposal, publicationCreateDto, user);

    return allPublicationsReturn;
  }

  async getAllPublications(proposalId: string, user: IRequestUser): Promise<PublicationGetDto[]> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, getAllPublicationsProjection, false);

    const allPublicationsReturn = proposal.publications.map((publication: PublicationDocument) => {
      const plain = publication.toObject();
      return plainToClass(PublicationGetDto, plain, { strategy: 'excludeAll' });
    });

    return allPublicationsReturn;
  }

  async updatePublication(
    proposalId: string,
    publicationId: string,
    publicationUpdateDto: PublicationUpdateDto,
    user: IRequestUser,
  ): Promise<PublicationGetDto[]> {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      undefined,
      true,
      ModificationContext.Publication,
    );

    const publicationIdx = proposal.publications.findIndex(
      (publication: PublicationDocument) => publication._id.toString() === publicationId,
    );

    if (publicationIdx === -1) {
      throw new NotFoundException('Publication not found');
    }

    const createdAt = proposal.publications[publicationIdx].createdAt;

    proposal.publications[publicationIdx] = {
      ...publicationUpdateDto,
      _id: publicationId,
      updatedAt: new Date(),
      createdAt,
    };

    const saveResult = await proposal.save();

    const allPublicationsReturn = saveResult.publications.map((publication: PublicationDocument) => {
      const plain = publication.toObject();
      return plainToClass(PublicationGetDto, plain, { strategy: 'excludeAll' });
    });

    await this.eventEngineService.handleProposalPublicationUpdate(proposal, publicationUpdateDto, user);

    return allPublicationsReturn;
  }

  async deletePublication(proposalId: string, publicationId: string, user: IRequestUser): Promise<void> {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      undefined,
      true,
      ModificationContext.Publication,
    );

    const publicationIdx = proposal.publications.findIndex(
      (publication: Publication) => publication._id.toString() === publicationId,
    );

    if (publicationIdx === -1) {
      return;
    }

    proposal.publications.splice(publicationIdx, 1);

    await proposal.save();
  }
}
