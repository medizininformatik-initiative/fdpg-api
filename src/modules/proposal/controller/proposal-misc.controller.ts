import { Body, Get, HttpCode, Param, Put, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { MarkAsDoneDto } from 'src/modules/comment/dto/mark-as-done.dto';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalValidation } from '../decorators/validation.decorator';
import { FdpgChecklistSetDto } from '../dto/proposal/fdpg-checklist.dto';
import { ResearcherIdentityDto } from '../dto/proposal/participants/researcher.dto';
import { SetBooleanStatusDto, SetProposalStatusDto } from '../dto/set-status.dto';
import { ProposalMiscService } from '../services/proposal-misc.service';

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
    @Body() checklist: FdpgChecklistSetDto,
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
}
