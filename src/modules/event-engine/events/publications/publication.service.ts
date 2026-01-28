import { Injectable } from '@nestjs/common';
import { PublicationNotificationService } from './publication-notification.service';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { PublicationCreateDto, PublicationUpdateDto } from 'src/modules/proposal/dto/proposal/publication.dto';

@Injectable()
export class PublicationService {
  constructor(private readonly publicationNotificationService: PublicationNotificationService) {}

  async handleCreate(proposal: Proposal, publication: PublicationCreateDto, proposalUrl: string) {
    await this.publicationNotificationService.handlePublicationCreate(proposal, publication, proposalUrl);
  }

  async handleUpdate(
    proposal: Proposal,
    publicationId: string,
    publication: PublicationUpdateDto,
    proposalUrl: string,
  ) {
    await this.publicationNotificationService.handlePublicationUpdate(proposal, publication, proposalUrl);
  }
}
