import {
  BadRequestException,
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MarkAsDoneDto } from 'src/modules/comment/dto/mark-as-done.dto';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalValidation } from '../decorators/validation.decorator';
import { ResearcherIdentityDto } from '../dto/proposal/participants/researcher.dto';
import { SetBooleanStatusDto, SetProposalStatusDto } from '../dto/set-status.dto';
import { SetFdpgCheckNotesDto } from '../dto/set-fdpg-check-notes.dto';
import { ProposalMiscService } from '../services/proposal-misc.service';
import { SetAdditionalLocationInformationDto } from '../dto/set-additional-location-information.dto';
import { FdpgChecklistUpdateDto } from '../dto/proposal/fdpg-checklist.dto';
import { DueDateEnum } from '../enums/due-date.enum';
import { IChecklistItem } from '../dto/proposal/checklist.types';
import { ProposalFormDto } from 'src/modules/proposal-form/dto/proposal-form.dto';
import { SelectedCohortDto } from '../dto/proposal/user-project/selected-cohort.dto';
import { UploadGetDto } from '../dto/upload.dto';
import { AutomaticSelectedCohortUploadDto, CohortUploadDto, SelectedCohortUploadDto } from '../dto/cohort-upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from 'src/shared/utils/multer-options.util';
import { ProposalIdQueryIdDto } from 'src/shared/dto/proposal-id-query-id.dto';
import { Response } from 'express';
import { ParticipantDto } from '../dto/proposal/participant.dto';
import { ProposalGetDto } from '../dto/proposal/proposal.dto';
import { Participant } from '../schema/sub-schema/participant.schema';
import { DizDetailsCreateDto, DizDetailsGetDto, DizDetailsUpdateDto } from '../dto/proposal/diz-details.dto';
import { CsvDownloadResponseDto } from '../dto/csv-download.dto';
import { ApplicantDto } from '../dto/proposal/applicant.dto';
import { ProjectAssigneeDto } from '../dto/proposal/project-assignee.dto';

@ApiController('proposals', undefined, 'misc')
export class ProposalMiscController {
  constructor(private readonly proposalMiscService: ProposalMiscService) {}

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember)
  @Get(':id/researcherInfo')
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiOperation({ summary: 'Gets participating researcher info by proposal id' })
  @ProposalValidation()
  async getResearcherInfo(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ResearcherIdentityDto[]> {
    return await this.proposalMiscService.getResearcherInfo(id, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember)
  @Put(':id/status')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Status successfully changed. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Sets the status of a proposal' })
  async setStatus(
    @Param() { id }: MongoIdParamDto,
    @Body() { value }: SetProposalStatusDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalMiscService.setStatus(id, value, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember)
  @Get(':id/proposalPdfFile')
  @ApiNotFoundResponse({ description: 'Proposal file could not be created' })
  @HttpCode(200)
  @ApiOperation({ summary: 'Generates and returns proposal pdf file of draft.' })
  async getPdfProposalFile(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<StreamableFile> {
    const buffer = await this.proposalMiscService.getPdfProposalFile(id, user);
    return new StreamableFile(buffer);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/isLocked')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Status successfully changed. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Sets the isLocked status of a proposal' })
  async setIsLockedStatus(
    @Param() { id }: MongoIdParamDto,
    @Body() { value }: SetBooleanStatusDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalMiscService.setIsLockedStatus(id, value, user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/fdpg-checklist')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiOperation({ summary: 'Merges the fdpg-checklist of a proposal' })
  async setFdpgChecklist(
    @Param() { id }: MongoIdParamDto,
    @Body() checklist: FdpgChecklistUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<Partial<IChecklistItem> | null> {
    return await this.proposalMiscService.setFdpgChecklist(id, checklist, user);
  }

  @Put(':mainId/:subId/isDone')
  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @ApiNoContentResponse({ description: 'Item successfully marked as done. No content returns.' })
  @HttpCode(204)
  @ProposalValidation()
  @ApiOperation({ summary: 'Updates the isDone field of a section' })
  async markSectionAsDone(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Body() { value }: MarkAsDoneDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalMiscService.markSectionAsDone(mainId, subId, value, user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/fdpgCheckNotes')
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'General Text successfully updated.' })
  @HttpCode(204)
  @ProposalValidation()
  @ApiOperation({ summary: 'Updates the fdpgCheckNotes field value.' })
  async setFdpgCheckNotes(
    @Param() { id }: MongoIdParamDto,
    @Body() { value }: SetFdpgCheckNotesDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalMiscService.setFdpgCheckNotes(id, value, user);
  }

  @Auth(Role.DizMember)
  @Post(':id/additionalLocationInformation')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Set additional information about location on proposal' })
  @HttpCode(204)
  @ApiBody({ type: SetAdditionalLocationInformationDto })
  @ApiOperation({ summary: 'Sets additional information about a location on a proposal' })
  async updateAdditionalLocationInformation(
    @Param() { id }: MongoIdParamDto,
    @Body() additionalLocationInformation: SetAdditionalLocationInformationDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return this.proposalMiscService.updateAdditionalInformationForLocation(id, additionalLocationInformation, user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/deadlines')
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Deadlines successfully updated.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Updates the deadlines field value.' })
  async setDeadlines(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: Record<DueDateEnum, Date | null>,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Invalid deadlines format');
    }

    await this.proposalMiscService.setDeadlines(id, dto, user);
  }

  @Auth(Role.Admin, Role.Researcher, Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember)
  @Get('proposal-form/versions')
  @ApiNotFoundResponse({ description: 'Item could not be found.' })
  @ApiOperation({ summary: 'Returns a list of all proposal form versions' })
  async getAllProposalFormVersions(): Promise<ProposalFormDto[]> {
    return await this.proposalMiscService.getAllProposalFormVersions();
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Put(':id/cohort/manual')
  @ApiNotFoundResponse({ description: 'Item could not be found.' })
  @ApiOperation({ summary: 'Creates a manual upload cohort on a proposal' })
  @ProposalValidation(true)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CohortUploadDto })
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('file', createMulterOptions()))
  async uploadManualCohort(
    @Param() { id }: MongoIdParamDto,
    @Body() newCohort: SelectedCohortUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() { user }: FdpgRequest,
  ): Promise<{ insertedCohort: SelectedCohortDto; uploadedFile: UploadGetDto }> {
    return await this.proposalMiscService.addManualUploadCohort(id, newCohort, file, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Put(':id/cohort/automatic')
  @ApiNotFoundResponse({ description: 'Item could not be found.' })
  @ApiOperation({ summary: 'Creates a cohort on a proposal' })
  @ProposalValidation()
  @UsePipes(ValidationPipe)
  async uploadAutomaticCohort(
    @Param() { id }: MongoIdParamDto,
    @Body() newCohort: AutomaticSelectedCohortUploadDto,
    @Request() { user }: FdpgRequest,
  ): Promise<SelectedCohortDto> {
    return await this.proposalMiscService.automaticCohortAdd(id, newCohort, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Delete(':mainId/cohort/:subId')
  @ApiNotFoundResponse({ description: 'Item could not be found.' })
  @ApiOperation({ summary: 'Deletes the upload and cohort on a proposal' })
  @ProposalValidation(true)
  async deleteCohort(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<SelectedCohortDto> {
    return await this.proposalMiscService.deleteCohort(mainId, subId, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember)
  @Post('query/csv')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: "Returns a queries zipped csv's" })
  async getFeasibilityCsvByQueryId(
    @Body() { proposalId, queryId }: ProposalIdQueryIdDto,
    @Request() { user }: FdpgRequest,
    @Res() res: Response,
  ) {
    const result = await this.proposalMiscService.getFeasibilityCsvByQueryId(proposalId, queryId, user);

    if (result && Buffer.isBuffer(result)) {
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="query-result.zip"',
        'Content-Length': result.length,
      });
      return res.status(200).send(result);
    } else {
      return res.status(204).send();
    }
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Get(':id/locations/csv')
  @ApiOperation({ summary: 'Get download link for CSV with all location information for contracting' })
  @ApiResponse({
    status: 200,
    description: 'Download link for CSV file with location information',
    type: CsvDownloadResponseDto,
  })
  async getLocationCsvDownloadLink(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<CsvDownloadResponseDto> {
    return await this.proposalMiscService.generateLocationCsvDownloadLink(id, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Patch(':id/participants')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Updates the participants of a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  async updateParticipants(
    @Param('id') id: string,
    @Body('participants') participants: ParticipantDto[],
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalGetDto> {
    return this.proposalMiscService.updateParticipants(id, participants as Participant[], user);
  }
  @Auth(Role.FdpgMember)
  @Delete(':id/participants/:participantId')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Removes a participant from a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal or participant could not be found' })
  async removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalGetDto> {
    return this.proposalMiscService.removeParticipant(id, participantId, user);
  }

  @Auth(Role.DizMember)
  @Post(':id/diz-details')
  @ApiOperation({ summary: 'Create DIZ details for a proposal' })
  @ApiResponse({ status: 201, description: 'DIZ details created successfully', type: DizDetailsGetDto })
  async createDizDetails(
    @Param() { id }: MongoIdParamDto,
    @Body() createDto: DizDetailsCreateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DizDetailsGetDto> {
    return this.proposalMiscService.createDizDetails(id, createDto, user);
  }

  @Auth(Role.DizMember)
  @Put(':id/diz-details/:dizDetailsId')
  @ApiOperation({ summary: 'Update DIZ details for a proposal' })
  @ApiResponse({ status: 200, description: 'DIZ details updated successfully', type: DizDetailsGetDto })
  async updateDizDetails(
    @Param() { id }: MongoIdParamDto,
    @Param('dizDetailsId') dizDetailsId: string,
    @Body() updateDto: DizDetailsUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DizDetailsGetDto> {
    return this.proposalMiscService.updateDizDetails(id, dizDetailsId, updateDto, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/applicant/participant-role')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Updates the applicant participant role of a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiNoContentResponse({ description: 'Applicant participant role successfully updated' })
  @HttpCode(204)
  async updateApplicantParticipantRole(
    @Param() { id }: MongoIdParamDto,
    @Body() updateDto: ApplicantDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    await this.proposalMiscService.updateApplicantParticipantRole(id, updateDto, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/participants/:participantId/make-responsible')
  @ApiOperation({ summary: 'Makes a participant the responsible scientist of a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal or participant could not be found' })
  @ApiNoContentResponse({ description: 'Participant successfully made responsible scientist' })
  @HttpCode(204)
  async makeParticipantResponsible(
    @Param() { id }: MongoIdParamDto,
    @Param('participantId') participantId: string,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    await this.proposalMiscService.makeParticipantResponsible(id, participantId, user);
  }

  @Auth(Role.FdpgMember)
  @Put(':id/assignee')
  @ApiOperation({ summary: 'Updates the project assignee' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiNoContentResponse({ description: 'Successfully set project assignee' })
  @HttpCode(204)
  async updateProjectAssignee(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
    @Body() { projectAssignee }: { projectAssignee?: ProjectAssigneeDto },
  ): Promise<void> {
    await this.proposalMiscService.updateProjectAssignee(id, user, projectAssignee);
  }
}
