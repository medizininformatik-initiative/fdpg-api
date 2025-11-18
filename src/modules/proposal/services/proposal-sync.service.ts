import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { AcptPluginClient } from '../../app/acpt-plugin/acpt-plugin.client';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Role } from 'src/shared/enums/role.enum';
import { ProposalType } from '../enums/proposal-type.enum';
import { SyncStatus } from '../enums/sync-status.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { AcptMetaField, AcptProjectDto, AcptResearcherDto, AcptLocationDto } from '../dto/acpt-plugin/acpt-project.dto';
import { PublishedProposalStatus } from '../enums/published-proposal.enum';
import { SyncResultDto, BulkSyncResultsDto, SyncErrorDto } from '../dto/sync-result.dto';

@Injectable()
export class ProposalSyncService {
  private readonly logger = new Logger(ProposalSyncService.name);

  constructor(
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    private acptPluginClient: AcptPluginClient,
  ) {}

  async syncProposal(proposalId: string, user: IRequestUser): Promise<SyncResultDto> {
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

      const currentProposal = await this.proposalModel.findById(proposal._id);
      if (!currentProposal) {
        throw new NotFoundException('Proposal not found after sync');
      }

      if (currentProposal.registerInfo?.syncStatus === SyncStatus.SyncFailed) {
        this.logger.warn(`Proposal ${proposalId} was marked as failed by another process. Aborting success update.`);
        return plainToClass(
          SyncResultDto,
          {
            success: false,
            proposalId: proposal._id.toString(),
            projectAbbreviation: proposal.projectAbbreviation,
            error: 'Sync was cancelled or failed',
          },
          { excludeExtraneousValues: true },
        );
      }

      if (!currentProposal.registerInfo) {
        currentProposal.registerInfo = {} as any;
      }
      currentProposal.registerInfo.syncStatus = SyncStatus.Synced;
      currentProposal.registerInfo.lastSyncedAt = new Date();
      currentProposal.registerInfo.lastSyncError = null;
      currentProposal.registerInfo.syncRetryCount = 0;
      currentProposal.registerInfo.acptPluginId = acptPluginId;

      if (currentProposal.status !== ProposalStatus.Published) {
        currentProposal.status = ProposalStatus.Published;
      }

      await currentProposal.save();

      this.logger.log(
        `Successfully synced proposal ${proposal.projectAbbreviation} with ACPT Plugin ID: ${acptPluginId}`,
      );

      return plainToClass(
        SyncResultDto,
        {
          success: true,
          proposalId: proposal._id.toString(),
          projectAbbreviation: proposal.projectAbbreviation,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      // Handle timeout specifically
      const errorMessage = error.message || 'Unknown error';
      const isTimeout =
        errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNABORTED');

      if (isTimeout) {
        this.logger.error(`TIMEOUT ERROR during sync for proposal ${proposalId}: ${errorMessage}`);
      } else {
        this.logger.error(`Sync failed for proposal ${proposalId}: ${errorMessage}`);
      }

      await this.handleSyncFailure(proposal._id.toString(), error);

      return plainToClass(
        SyncResultDto,
        {
          success: false,
          proposalId: proposal._id.toString(),
          projectAbbreviation: proposal.projectAbbreviation,
          error: errorMessage,
        },
        { excludeExtraneousValues: true },
      );
    }
  }

  async retrySync(proposalId: string, user: IRequestUser): Promise<SyncResultDto> {
    const proposal = await this.findAndValidate(proposalId, user);

    const retryCount = proposal.registerInfo?.syncRetryCount || 0;

    if (!proposal.registerInfo) {
      proposal.registerInfo = {} as any;
    }
    proposal.registerInfo.syncRetryCount = retryCount + 1;
    await proposal.save();

    this.logger.log(`Retrying sync for proposal ${proposalId} (attempt ${retryCount + 1})`);

    return this.syncProposal(proposalId, user);
  }

  async syncAllProposals(user: IRequestUser): Promise<BulkSyncResultsDto> {
    this.validateFdpgPermissions(user);

    const proposals = await this.proposalModel.find({
      type: ProposalType.RegisteringForm,
      status: ProposalStatus.Published,
      'registerInfo.syncStatus': { $in: [SyncStatus.OutOfSync, SyncStatus.SyncFailed, SyncStatus.NotSynced] },
    });

    if (proposals.length === 0) {
      throw new BadRequestException('No proposals to sync');
    }

    this.logger.log(`Starting bulk sync for ${proposals.length} proposals with concurrency limit of 3`);

    const results = {
      total: proposals.length,
      synced: 0,
      failed: 0,
      errors: [] as Array<SyncErrorDto>,
    };

    const syncResults = await this.syncWithConcurrency(
      proposals.map((p) => () => this.syncProposal(p._id.toString(), user)),
      3,
    );

    syncResults.forEach((result) => {
      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push({
          projectAbbreviation: result.projectAbbreviation,
          error: result.error || 'Unknown error',
        });
      }
    });

    this.logger.log(`Bulk sync completed: ${results.synced}/${results.total} synced, ${results.failed} failed`);

    return plainToClass(BulkSyncResultsDto, results, { excludeExtraneousValues: true });
  }

  private async callAcptPlugin(proposal: ProposalDocument, isUpdate: boolean): Promise<string> {
    try {
      // Step 1: Sync researchers first (they need to exist before project)
      this.logger.log(`[1/3] Syncing researchers for project ${proposal.projectAbbreviation}...`);
      const researcherIds = await this.syncResearchers(proposal);
      this.logger.log(`✓ Synced ${researcherIds.length} researchers for project ${proposal.projectAbbreviation}`);

      // Step 2: Sync locations (they need to exist before project)
      this.logger.log(`[2/3] Syncing locations for project ${proposal.projectAbbreviation}...`);
      const { desiredLocationIds, participantInstituteIds } = await this.syncLocations(proposal);
      this.logger.log(
        `✓ Synced ${desiredLocationIds.length} desired locations and ${participantInstituteIds.length} participant institutes for project ${proposal.projectAbbreviation}`,
      );

      // Step 3: Build project payload with researcher and location IDs
      this.logger.log(
        `[3/3] ${isUpdate ? 'Updating' : 'Creating'} project in ACPT Plugin for ${proposal.projectAbbreviation}...`,
      );
      const projectData: AcptProjectDto = this.buildAcptPayload(
        proposal,
        researcherIds,
        desiredLocationIds,
        participantInstituteIds,
      );

      try {
        const projectResponse = isUpdate
          ? await this.acptPluginClient.updateProject(proposal.registerInfo?.acptPluginId, projectData)
          : await this.acptPluginClient.createProject(projectData);

        this.logger.log(
          `✓ Project ${isUpdate ? 'updated' : 'created'} successfully with WordPress ID: ${projectResponse.id}`,
        );
        return projectResponse.id;
      } catch (error) {
        if (isUpdate && error.message?.includes('404')) {
          this.logger.warn(
            `Update failed with 404 for ID ${proposal.registerInfo?.acptPluginId}. Falling back to CREATE.`,
          );
          const projectResponse = await this.acptPluginClient.createProject(projectData);
          this.logger.log(`✓ Project created successfully with WordPress ID: ${projectResponse.id}`);
          return projectResponse.id;
        }

        throw error;
      }
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      const isTimeout =
        errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNABORTED');

      if (isTimeout) {
        throw new Error(
          `ACPT Plugin sync timed out: ${errorMessage}. This usually means the WordPress server is slow or unreachable. Try again later.`,
        );
      }

      throw new Error(`ACPT Plugin sync failed: ${errorMessage}`);
    }
  }

  private async syncResearchers(proposal: ProposalDocument): Promise<string[]> {
    const researcherIds: string[] = [];

    const researcher = proposal.projectResponsible?.researcher;

    if (!researcher?.firstName || !researcher?.lastName) {
      this.logger.warn(`No valid responsible scientist found for project ${proposal.projectAbbreviation}`);
      return researcherIds;
    }

    this.logger.log(
      `Syncing responsible scientist ${researcher.firstName} ${researcher.lastName} for project ${proposal.projectAbbreviation}`,
    );

    try {
      const researcherId = await this.ensureResearcherExists(
        researcher.firstName,
        researcher.lastName,
        researcher.title,
        researcher.affiliation,
      );

      if (researcherId) {
        researcherIds.push(researcherId);
      }
    } catch (error) {
      this.logger.error(`Failed to sync researcher ${researcher.firstName} ${researcher.lastName}: ${error.message}`);
      throw error;
    }

    return researcherIds;
  }

  private async ensureResearcherExists(
    firstName: string,
    lastName: string,
    title?: string,
    affiliation?: string,
  ): Promise<string | null> {
    const existingId = await this.acptPluginClient.findResearcherByName(firstName, lastName);

    if (existingId) {
      this.logger.log(`Researcher ${firstName} ${lastName} already exists with ID ${existingId}`);
      return existingId;
    }

    this.logger.log(`Creating new researcher: ${firstName} ${lastName}`);

    const researcherData: AcptResearcherDto = this.buildResearcherPayload(firstName, lastName, title, affiliation);

    const response = await this.acptPluginClient.createResearcher(researcherData);
    this.logger.log(`Created researcher ${firstName} ${lastName} with ID ${response.id}`);

    return response.id;
  }

  private buildResearcherPayload(
    firstName: string,
    lastName: string,
    title?: string,
    affiliation?: string,
  ): AcptResearcherDto {
    const meta: AcptMetaField[] = [
      { box: 'fdpgx-researcher-fields', field: 'fdpgx-firstname', value: firstName },
      { box: 'fdpgx-researcher-fields', field: 'fdpgx-lastname', value: lastName },
    ];

    if (title) {
      meta.push({ box: 'fdpgx-researcher-fields', field: 'fdpgx-scientifictitle', value: title });
    }

    if (affiliation) {
      meta.push({ box: 'fdpgx-researcher-fields', field: 'fdpgx-affiliation', value: affiliation });
    }

    return {
      title: `${title || ''} ${firstName} ${lastName}`.trim(),
      status: 'publish',
      content: '',
      acpt: { meta },
    };
  }

  private async syncLocations(
    proposal: ProposalDocument,
  ): Promise<{ desiredLocationIds: string[]; participantInstituteIds: string[] }> {
    const desiredLocationIds: string[] = [];
    const participantInstituteIds: string[] = [];

    const desiredLocationNames = new Set<string>();
    proposal.userProject?.addressees?.desiredLocations?.forEach((loc) => {
      if (loc && loc !== 'VIRTUAL_ALL') {
        desiredLocationNames.add(loc);
      }
    });

    this.logger.log(
      `Found ${desiredLocationNames.size} desired locations to sync for project ${proposal.projectAbbreviation}`,
    );

    for (const locationName of Array.from(desiredLocationNames)) {
      try {
        const locationId = await this.ensureLocationExists(locationName);
        if (locationId) {
          desiredLocationIds.push(locationId);
        }
      } catch (error) {
        this.logger.error(`Failed to sync desired location ${locationName}: ${error.message}`);
      }
    }

    const participantInstituteNames = new Set<string>();
    proposal.participants?.forEach((p) => {
      const instituteName = p.institute?.miiLocation || p.institute?.name;
      if (instituteName) {
        participantInstituteNames.add(instituteName);
      }
    });

    this.logger.log(
      `Found ${participantInstituteNames.size} participant institutes to sync for project ${proposal.projectAbbreviation}`,
    );

    for (const locationName of Array.from(participantInstituteNames)) {
      try {
        const locationId = await this.ensureLocationExists(locationName);
        if (locationId) {
          participantInstituteIds.push(locationId);
        }
      } catch (error) {
        this.logger.error(`Failed to sync participant institute ${locationName}: ${error.message}`);
      }
    }

    return { desiredLocationIds, participantInstituteIds };
  }

  private async ensureLocationExists(locationName: string): Promise<string | null> {
    const existingId = await this.acptPluginClient.findLocationByName(locationName);

    if (existingId) {
      this.logger.log(`Location ${locationName} already exists with ID ${existingId}`);
      return existingId;
    }

    this.logger.log(`Creating new location: ${locationName}`);

    const locationData: AcptLocationDto = this.buildLocationPayload(locationName);

    const response = await this.acptPluginClient.createLocation(locationData);
    this.logger.log(`Created location ${locationName} with ID ${response.id}`);

    return response.id;
  }

  private buildLocationPayload(locationName: string): AcptLocationDto {
    const meta: AcptMetaField[] = [{ box: 'location-fields', field: 'fdpgx-name', value: locationName }];

    return {
      title: locationName,
      status: 'publish',
      content: '',
      acpt: { meta },
    };
  }

  private buildAcptPayload(
    proposal: ProposalDocument,
    researcherIds: string[],
    desiredLocationIds: string[],
    participantInstituteIds: string[],
  ): AcptProjectDto {
    const meta: AcptMetaField[] = [];

    if (researcherIds.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-researcher',
        value: researcherIds,
      });
    }

    if (desiredLocationIds.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-location',
        value: desiredLocationIds,
      });
    }

    if (participantInstituteIds.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-participantsinstitute',
        value: participantInstituteIds,
      });
    }

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
        value: startDate.toISOString().split('T')[0],
      });
    }

    if (proposal.userProject?.generalProjectInformation?.projectDuration) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-projectduration',
        value: String(proposal.userProject.generalProjectInformation.projectDuration),
      });

      if (proposal.userProject?.generalProjectInformation?.desiredStartTime) {
        let endDate: Date;
        if (proposal.registerInfo?.isInternalRegistration && proposal.deadlines.DUE_DAYS_FINISHED_PROJECT) {
          // For internal registrations with a finished project deadline, set end date to that deadline
          endDate = new Date(proposal.deadlines.DUE_DAYS_FINISHED_PROJECT);
        } else {
          const startDate = new Date(proposal.userProject.generalProjectInformation.desiredStartTime);
          const duration = proposal.userProject.generalProjectInformation.projectDuration;
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + duration);
        }

        meta.push({
          box: 'project-fields',
          field: 'fdpgx-projectend',
          value: endDate.toISOString().split('T')[0],
        });
      }
    }

    let projectState = PublishedProposalStatus.PUBLISHED;
    if (
      proposal.registerInfo.originalProposalStatus &&
      proposal.registerInfo.originalProposalStatus in PublishedProposalStatus
    ) {
      projectState = PublishedProposalStatus[proposal.registerInfo.originalProposalStatus];
    }
    meta.push({
      box: 'project-fields',
      field: 'fdpgx-projectstate',
      value: projectState,
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

    if (proposal.userProject?.typeOfUse?.usage?.length > 0) {
      meta.push({
        box: 'project-fields',
        field: 'fdpgx-usage',
        value: proposal.userProject.typeOfUse.usage.join(', '),
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
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      this.logger.error(`Proposal ${proposalId} not found when trying to mark sync as failed`);
      return;
    }

    if (!proposal.registerInfo) {
      proposal.registerInfo = {} as any;
    }
    proposal.registerInfo.syncStatus = SyncStatus.SyncFailed;
    proposal.registerInfo.lastSyncError = error.message || 'Unknown error';
    await proposal.save();
  }

  private async updateSyncStatus(proposalId: string, status: SyncStatus): Promise<void> {
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      this.logger.error(`Proposal ${proposalId} not found when trying to update sync status`);
      return;
    }

    if (!proposal.registerInfo) {
      proposal.registerInfo = {} as any;
    }
    proposal.registerInfo.syncStatus = status;
    await proposal.save();
  }

  /**
   * Execute async functions with concurrency control
   * @param tasks Array of functions that return promises
   * @param concurrency Maximum number of concurrent executions
   * @returns Array of results in the same order as input tasks
   */
  private async syncWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < tasks.length) {
        const index = currentIndex++;
        results[index] = await tasks[index]();
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());

    await Promise.all(workers);

    return results;
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
