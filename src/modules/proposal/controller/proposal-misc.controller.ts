import {
  BadRequestException,
  Body,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Request,
  StreamableFile,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBody, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
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
import { SetDeadlinesDto } from '../dto/set-deadlines.dto';
import { DueDateEnum } from '../enums/due-date.enum';
import { FdpgChecklistUpdateDto } from '../dto/proposal/fdpg-checklist.dto';

@ApiController('proposals', undefined, 'misc')
export class ProposalMiscController {
  constructor(private readonly proposalMiscService: ProposalMiscService) {}

  @Auth(Role.FdpgMember)
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

  @Auth(Role.Researcher, Role.FdpgMember, Role.DizMember, Role.UacMember)
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

  @Auth(Role.Researcher, Role.FdpgMember)
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

  @Auth(Role.FdpgMember)
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

  @Auth(Role.FdpgMember)
  @Put(':id/fdpg-checklist')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Checklist successfully changed. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Merges the fdpg-checklist of a proposal' })
  async setFdpgChecklist(
    @Param() { id }: MongoIdParamDto,
    @Body() checklist: FdpgChecklistUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalMiscService.setFdpgChecklist(id, checklist, user);
  }

  @Put(':mainId/:subId/isDone')
  @Auth(Role.FdpgMember)
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

  @Auth(Role.FdpgMember)
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

  @Auth(Role.FdpgMember)
  @Put(':id/deadlines')
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Deadlines successfully updated.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Updates the deadlines field value.' })
  async setDeadlines(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: SetDeadlinesDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    if (!dto || !dto.deadlines || typeof dto.deadlines !== 'object') {
      throw new BadRequestException('Invalid deadlines format');
    }

    const deadlines: Record<DueDateEnum, Date | null> = {
      [DueDateEnum.DUE_DAYS_FDPG_CHECK]: dto.deadlines.DUE_DAYS_FDPG_CHECK
        ? new Date(dto.deadlines.DUE_DAYS_FDPG_CHECK)
        : null,
      [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: dto.deadlines.DUE_DAYS_DATA_CORRUPT
        ? new Date(dto.deadlines.DUE_DAYS_DATA_CORRUPT)
        : null,
      [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: dto.deadlines.DUE_DAYS_FINISHED_PROJECT
        ? new Date(dto.deadlines.DUE_DAYS_FINISHED_PROJECT)
        : null,
      [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: dto.deadlines.DUE_DAYS_LOCATION_CHECK
        ? new Date(dto.deadlines.DUE_DAYS_LOCATION_CHECK)
        : null,
      [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: dto.deadlines.DUE_DAYS_EXPECT_DATA_DELIVERY
        ? new Date(dto.deadlines.DUE_DAYS_EXPECT_DATA_DELIVERY)
        : null,
      [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: dto.deadlines.DUE_DAYS_LOCATION_CONTRACTING
        ? new Date(dto.deadlines.DUE_DAYS_LOCATION_CONTRACTING)
        : null,
    };

    await this.proposalMiscService.setDeadlines(id, deadlines, user);
  }
}
