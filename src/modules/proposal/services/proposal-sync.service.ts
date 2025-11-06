import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { AcptPluginClient } from '../../app/acpt-plugin/acpt-plugin.client';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Role } from 'src/shared/enums/role.enum';
import { ProposalType } from '../enums/proposal-type.enum';
import { SyncStatus } from '../enums/sync-status.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { AcptMetaField, AcptProjectDto } from '../dto/acpt-plugin/acpt-project.dto';

export interface SyncResult {
  success: boolean;
  proposalId: string;
  projectAbbreviation: string;
  error?: string;
}

export interface BulkSyncResults {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ projectAbbreviation: string; error: string }>;
}

@Injectable()
export class ProposalSyncService {
  private readonly logger = new Logger(ProposalSyncService.name);

  constructor(
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    private acptPluginClient: AcptPluginClient,
  ) {}

  async syncProposal(proposalId: string, user: IRequestUser): Promise<SyncResult> {
    this.logger.log(`Starting sync for proposal ${proposalId}`);
    const proposal = await this.findAndValidate(proposalId, user);

    try {
      await this.updateSyncStatus(proposal._id.toString(), SyncStatus.Syncing);

      const hasRealId = proposal.registerInfo?.acptPluginId;
      const isUpdate = !!hasRealId;

      this.logger.log(
        `Sync mode: ${isUpdate ? 'UPDATE' : 'CREATE'} (acptPluginId: ${proposal.registerInfo?.acptPluginId || 'none'})`,
      );

      const acptPluginId = await this.callAcptPlugin(proposal, isUpdate);

      const updateFields: any = {
        'registerInfo.syncStatus': SyncStatus.Synced,
        'registerInfo.lastSyncedAt': new Date(),
        'registerInfo.lastSyncError': null,
        'registerInfo.syncRetryCount': 0,
        'registerInfo.acptPluginId': acptPluginId,
      };

      if (proposal.status !== ProposalStatus.Published) {
        updateFields.status = ProposalStatus.Published;
      }

      await this.proposalModel.updateOne({ _id: proposal._id }, { $set: updateFields });

      this.logger.log(`Successfully synced proposal ${proposal.projectAbbreviation}`);

      return {
        success: true,
        proposalId: proposal._id.toString(),
        projectAbbreviation: proposal.projectAbbreviation,
      };
    } catch (error) {
      await this.handleSyncFailure(proposal._id.toString(), error);

      this.logger.error(`Sync failed for proposal ${proposalId}: ${error.message}`);

      return {
        success: false,
        proposalId: proposal._id.toString(),
        projectAbbreviation: proposal.projectAbbreviation,
        error: error.message,
      };
    }
  }

  async retrySync(proposalId: string, user: IRequestUser): Promise<SyncResult> {
    const proposal = await this.findAndValidate(proposalId, user);

    const retryCount = proposal.registerInfo?.syncRetryCount || 0;
    await this.proposalModel.updateOne({ _id: proposal._id }, { $inc: { 'registerInfo.syncRetryCount': 1 } });

    this.logger.log(`Retrying sync for proposal ${proposalId} (attempt ${retryCount + 1})`);

    return this.syncProposal(proposalId, user);
  }

  async syncAllProposals(user: IRequestUser): Promise<BulkSyncResults> {
    this.validateFdpgPermissions(user);

    const proposals = await this.proposalModel.find({
      type: ProposalType.RegisteringForm,
      status: ProposalStatus.Published,
      'registerInfo.isInternalRegistration': { $ne: true },
      'registerInfo.syncStatus': { $in: [SyncStatus.OutOfSync, SyncStatus.SyncFailed] },
    });

    if (proposals.length === 0) {
      throw new BadRequestException('No proposals to sync');
    }

    this.logger.log(`Starting bulk sync for ${proposals.length} proposals`);

    const results: BulkSyncResults = {
      total: proposals.length,
      synced: 0,
      failed: 0,
      errors: [],
    };

    // Sync all proposals sequentially (could be optimized with Promise.all with concurrency limit)
    for (const proposal of proposals) {
      const result = await this.syncProposal(proposal._id.toString(), user);
      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push({
          projectAbbreviation: proposal.projectAbbreviation,
          error: result.error || 'Unknown error',
        });
      }
    }

    this.logger.log(`Bulk sync completed: ${results.synced}/${results.total} synced, ${results.failed} failed`);

    return results;
  }

  private async callAcptPlugin(proposal: ProposalDocument, isUpdate: boolean): Promise<string> {
    const projectData: AcptProjectDto = this.buildAcptPayload(proposal);

    try {
      const projectResponse = isUpdate
        ? await this.acptPluginClient.updateProject(proposal.registerInfo?.acptPluginId, projectData)
        : await this.acptPluginClient.createProject(projectData);

      return projectResponse.id;
    } catch (error) {
      // If UPDATE fails with 404 (project doesn't exist in WordPress), fallback to CREATE
      if (isUpdate && error.message?.includes('404')) {
        this.logger.warn(
          `Update failed with 404 for ID ${proposal.registerInfo?.acptPluginId}. Falling back to CREATE.`,
        );
        const projectResponse = await this.acptPluginClient.createProject(projectData);
        return projectResponse.id;
      }

      throw error;
    }
  }

  private buildAcptPayload(proposal: ProposalDocument): AcptProjectDto {
    const meta: AcptMetaField[] = [];

    if (proposal.userProject?.generalProjectInformation?.projectTitle) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-projecttitle',
        value: proposal.userProject.generalProjectInformation.projectTitle,
      });
    }

    if (proposal.projectAbbreviation) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-projectabbreviation',
        value: proposal.projectAbbreviation,
      });
    }

    if (proposal.userProject?.generalProjectInformation?.desiredStartTime) {
      const startDate = new Date(proposal.userProject.generalProjectInformation.desiredStartTime);
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-projectstart',
        value: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      });
    }

    if (proposal.userProject?.generalProjectInformation?.projectDuration) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-projectduration',
        value: String(proposal.userProject.generalProjectInformation.projectDuration),
      });

      if (proposal.userProject?.generalProjectInformation?.desiredStartTime) {
        const startDate = new Date(proposal.userProject.generalProjectInformation.desiredStartTime);
        const duration = proposal.userProject.generalProjectInformation.projectDuration;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + duration);
        meta.push({
          box: 'project-fields',
          field: 'fdpgx-projectend',
          value: endDate.toISOString().split('T')[0],
        });
      }
    }

    // Project State (always "Projekt veröffentlicht" when Published)
    meta.push({
      box: 'project-fields',
      field: 'fdpgx-projectstate',
      value: 'Projekt veröffentlicht',
    });

    if (proposal.userProject?.projectDetails?.simpleProjectDescription) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-simpleprojectdescription',
        value: proposal.userProject.projectDetails.simpleProjectDescription,
      });
    }

    if (proposal.registerInfo?.projectCategory) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-medicalfields',
        value: [proposal.registerInfo.projectCategory],
      });
    }

    if (proposal.userProject?.projectDetails?.scientificBackground) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-scientificbackground',
        value: proposal.userProject.projectDetails.scientificBackground,
      });
    }

    if (proposal.userProject?.projectDetails?.hypothesisAndQuestionProjectGoals) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-hypothesisandquestionprojectgoals',
        value: proposal.userProject.projectDetails.hypothesisAndQuestionProjectGoals,
      });
    }

    if (proposal.userProject?.projectDetails?.materialAndMethods) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-materialandmethods',
        value: proposal.userProject.projectDetails.materialAndMethods,
      });
    }

    if (proposal.userProject?.generalProjectInformation?.projectFunding) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-fundingpartner',
        value: proposal.userProject.generalProjectInformation.projectFunding,
      });
    }

    if (proposal.userProject?.generalProjectInformation?.fundingReferenceNumber) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-projectfunding',
        value: proposal.userProject.generalProjectInformation.fundingReferenceNumber,
      });
    }

    if (proposal.userProject?.generalProjectInformation?.keywords?.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-tags',
        value: proposal.userProject.generalProjectInformation.keywords,
      });
    }

    if (proposal.registerInfo?.diagnoses?.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-diagnoses',
        value: proposal.registerInfo.diagnoses,
      });
    }

    if (proposal.registerInfo?.procedures?.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-procedures',
        value: proposal.registerInfo.procedures,
      });
    }

    if (proposal.registerInfo?.projectUrl) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-url',
        value: proposal.registerInfo.projectUrl,
      });
    }

    if (proposal.registerInfo?.legalBasis) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-legalbasis',
        value: ['1'], // "1" represents "has legal basis"
      });
    }

    if (proposal.userProject?.addressees?.desiredLocations?.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-location',
        value: proposal.userProject.addressees.desiredLocations,
      });

      //  participating institutes
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-participantsinstitute',
        value: proposal.userProject.addressees.desiredLocations,
      });
    }

    // Researcher Information (Responsible Scientist)
    // Note: fdpgx-researcher expects an array of researcher IDs
    // According to ZARS-716, researcher information is handled separately
    // and should not be included in the registration form meta fields

    // Local Project flag (0 for internally registered projects, 1 for external)
    meta.push({
      box: 'project-fields',
      field: 'fdpgx-localproject',
      value: proposal.registerInfo?.isInternalRegistration ? '0' : '1',
    });

    return {
      title: proposal.userProject?.generalProjectInformation?.projectTitle || proposal.projectAbbreviation,
      status: 'publish', // WordPress post status
      content: proposal.userProject?.projectDetails?.simpleProjectDescription || '',
      acpt: {
        meta,
      },
    };
  }

  private async handleSyncFailure(proposalId: string, error: any): Promise<void> {
    await this.proposalModel.updateOne(
      { _id: proposalId },
      {
        $set: {
          'registerInfo.syncStatus': SyncStatus.SyncFailed,
          'registerInfo.lastSyncError': error.message || 'Unknown error',
        },
      },
    );
  }

  private async updateSyncStatus(proposalId: string, status: SyncStatus): Promise<void> {
    await this.proposalModel.updateOne({ _id: proposalId }, { $set: { 'registerInfo.syncStatus': status } });
  }

  private async findAndValidate(proposalId: string, user: IRequestUser): Promise<ProposalDocument> {
    const proposal = await this.proposalModel.findById(proposalId);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.type !== ProposalType.RegisteringForm) {
      throw new BadRequestException('Only registering forms can be synced');
    }

    this.validateFdpgPermissions(user);

    return proposal;
  }

  private validateFdpgPermissions(user: IRequestUser): void {
    if (!user.roles.includes(Role.FdpgMember) && !user.roles.includes(Role.DataSourceMember)) {
      throw new ForbiddenException('Only FDPG members can sync proposals');
    }
  }
}
