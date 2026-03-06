import {
  Body,
  HttpCode,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { createMulterOptions } from 'src/shared/utils/multer-options.util';
import { MarkAsDoneDto } from '../../comment/dto/mark-as-done.dto';
import { ProposalValidation } from '../decorators/validation.decorator';
import { ContractingUploadDto } from '../dto/contracting-upload.dto';
import { ProposalGetDto, ProposalMarkConditionAcceptedReturnDto } from '../dto/proposal/proposal.dto';
import { SetDizApprovalDto } from '../dto/set-diz-approval.dto';
import { SetUacApprovalDto, SetUacApprovalWithFileDto } from '../dto/set-uac-approval.dto';
import { RevertLocationVoteDto } from '../dto/revert-location-vote.dto';
import { SignContractDto, SignContractWithFileDto } from '../dto/sign-contract.dto';
import { InitContractingDto, UpdateContractingDto } from '../dto/proposal/init-contracting.dto';
import { ProposalContractingService } from '../services/proposal-contracting.service';
import { SetDizConditionApprovalDto } from '../dto/set-diz-condition-approval.dto';
import { SkipContractDto, SkipContractWithFileDto } from '../dto/skip-contract.dto';

@ApiController('proposals', undefined, 'contracting')
export class ProposalContractingController {
  constructor(private readonly proposalContractingService: ProposalContractingService) {}

  @Auth(Role.DizMember)
  @Post(':id/dizApproval')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Vote successfully set. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Sets the DIZ vote of a proposal' })
  async setDizVote(
    @Param() { id }: MongoIdParamDto,
    @Body() vote: SetDizApprovalDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalContractingService.setDizApproval(id, vote, user);
  }

  @Auth(Role.UacMember)
  @Post(':id/uacApproval')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Vote successfully set. No content returns.' })
  @HttpCode(204)
  @UseInterceptors(FileInterceptor('file', createMulterOptions()))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SetUacApprovalWithFileDto })
  @ApiOperation({ summary: 'Sets the UAC vote of a proposal' })
  async setUacVote(
    @Param() { id }: MongoIdParamDto,
    @UploadedFile() file: Express.Multer.File,
    @Body() vote: SetUacApprovalDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalContractingService.setUacApproval(id, vote, file, user);
  }

  @Auth(Role.DizMember)
  @Post(':id/dizConditionApproval')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Vote successfully set. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Sets the UAC vote after a DIZ condition review of a proposal' })
  @ApiBody({ type: SetDizConditionApprovalDto })
  async dizConditionApproval(
    @Param() { id }: MongoIdParamDto,
    @Body() vote: SetDizConditionApprovalDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalContractingService.dizConditionApproval(id, vote, user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Post(':id/revertLocationVote')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({ summary: 'FDPG member reverts locations vote ' })
  @ApiNoContentResponse({ description: 'Locations vote reverted. No content returns.' })
  @HttpCode(204)
  @ApiBody({ type: RevertLocationVoteDto })
  async revertLocationVote(
    @Param() { id }: MongoIdParamDto,
    @Body() { location }: RevertLocationVoteDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalContractingService.revertLocationVote(id, location, user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/init-contracting')
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('file', createMulterOptions()))
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({ summary: 'Initiates contracting status and provides the contract draft' })
  @ApiNoContentResponse({ description: 'Contracting successfully initiated. No content returns.' })
  @HttpCode(204)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ContractingUploadDto })
  async initContracting(
    @Param() { id }: MongoIdParamDto,
    @UploadedFile() file: Express.Multer.File,
    @Body() locations: InitContractingDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalContractingService.initContracting(id, file, locations, user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Post(':id/update-contracting')
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('file', createMulterOptions()))
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({ summary: 'Initiates contracting status and provides the contract draft' })
  @ApiNoContentResponse({ description: 'Contracting successfully initiated. No content returns.' })
  @HttpCode(204)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ContractingUploadDto })
  async updateContracting(
    @Param() { id }: MongoIdParamDto,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadId: UpdateContractingDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalContractingService.updateContractDraft(id, file, uploadId.uploadId, user);
  }

  @Auth(Role.DizMember, Role.Researcher)
  @Post(':id/signContract')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Contract successfully signed. No content returns.' })
  @HttpCode(204)
  @UseInterceptors(FileInterceptor('file', createMulterOptions()))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SignContractWithFileDto })
  @ApiOperation({ summary: 'Signs a contract of a proposal' })
  async signContract(
    @Param() { id }: MongoIdParamDto,
    @UploadedFile() file: Express.Multer.File,
    @Body() vote: SignContractDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.proposalContractingService.signContract(id, vote, file, user);
  }

  @Put(':mainId/uacApproval/:subId/isAccepted')
  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiOperation({ summary: 'Updates the isAccepted field of an approval condition' })
  async markConditionAsAccepted(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Body() { value }: MarkAsDoneDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalMarkConditionAcceptedReturnDto> {
    return await this.proposalContractingService.markUacConditionAsAccepted(mainId, subId, value, user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Post(':id/skip-contract')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Contract successfully skipped.' })
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', createMulterOptions()))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SkipContractWithFileDto })
  @ApiOperation({ summary: 'Skips a contract of a proposal' })
  async skipContract(
    @Param() { id }: MongoIdParamDto,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SkipContractDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalGetDto> {
    return await this.proposalContractingService.skipContract(id, dto, file, user);
  }
}
