import { Injectable } from '@nestjs/common';
import { PublicationNotificationService } from './publication-notification.service';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { PublicationCreateDto, PublicationUpdateDto } from 'src/modules/proposal/dto/proposal/publication.dto';
import { RegisterFormService } from 'src/modules/proposal/services/register-form.service';
import { IRequestUser } from 'src/shared/types/request-user.interface';

@Injectable()
export class PublicationService {
  constructor(
    private readonly publicationNotificationService: PublicationNotificationService,
    private readonly registerFormService: RegisterFormService,
  ) {}

  async handleCreate(proposal: Proposal, publication: PublicationCreateDto, proposalUrl: string, user: IRequestUser) {
    await this.publicationNotificationService.handlePublicationCreate(proposal, publication, proposalUrl);
    await this.registerFormService.handlePublicationCreate(proposal, publication, proposalUrl, user);
  }

  async handleUpdate(proposal: Proposal, publication: PublicationUpdateDto, proposalUrl: string, user: IRequestUser) {
    await this.publicationNotificationService.handlePublicationUpdate(proposal, publication, proposalUrl);
    await this.registerFormService.handlePublicationUpdate(proposal, publication, proposalUrl, user);
  }
}
