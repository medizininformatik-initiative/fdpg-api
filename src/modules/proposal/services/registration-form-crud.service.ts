import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { Model } from 'mongoose';
import { ProposalType } from '../enums/proposal-type.enum';
import { ModificationContext } from '../enums/modification-context.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { SyncStatus } from '../enums/sync-status.enum';
import { ProposalCrudService } from './proposal-crud.service';

@Injectable()
export class RegistrationFormCrudService {
  private readonly logger = new Logger(RegistrationFormCrudService.name);

  constructor(
    @InjectModel(Proposal.name)
    private readonly proposalModel: Model<ProposalDocument>,
    private readonly proposalCrudService: ProposalCrudService,
  ) {}

  checkProposalType(proposal: Proposal): boolean {
    const result = proposal.type === ProposalType.ApplicationForm && !!proposal.registerFormId;

    if (!result) {
      this.logger.log(`Proposal ${proposal.projectAbbreviation} is not an ApplicationForm with registerFormId`);
    }

    return result;
  }

  async setRegistrationOutOfSync(registrationId: string): Promise<void> {
    try {
      this.logger.log(`Updating registering form ${registrationId} to OutOfSync`);
      await this.proposalModel.updateOne(
        { _id: registrationId },
        {
          $set: {
            'registerInfo.syncStatus': SyncStatus.OutOfSync,
          },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to update registering form for ${registrationId}: ${error.message}`);
    }
  }

  async getRegistration(
    proposal: Proposal,
    user: IRequestUser,
    modificationContext: ModificationContext,
  ): Promise<ProposalDocument> {
    const projection = { projectAbbreviation: 1, reports: 1, publications: 1, owner: 1 };

    const proposalDoc = await this.proposalCrudService.findDocument(
      proposal._id,
      user,
      undefined,
      false,
      modificationContext,
    );

    const registration = await this.proposalCrudService.findDocument(
      proposalDoc.registerFormId,
      user,
      projection,
      true,
      modificationContext,
    );

    if (registration.registerInfo?.originalProposalId !== proposal._id) {
      throw new Error(
        `Registration form ${registration.projectAbbreviation} is not linked to proposal ${proposal.projectAbbreviation}`,
      );
    }

    return registration;
  }
}
