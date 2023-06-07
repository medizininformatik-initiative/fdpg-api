import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Request,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { REPORTS_MAX_UPLOAD_COUNT } from 'src/shared/constants/global.constants';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { createMulterOptions } from 'src/shared/utils/multer-options.util';
import { ProposalValidation } from '../decorators/validation.decorator';
import {
  ReportCreateDto,
  ReportCreateWithFilesDto,
  ReportGetDto,
  ReportUpdateDto,
  ReportUpdateWithFilesDto,
} from '../dto/proposal/report.dto';
import { ProposalReportService } from '../services/proposal-report.service';

@ApiController('proposals', undefined, 'reports')
export class ProposalReportController {
  constructor(private readonly proposalReportService: ProposalReportService) {}

  @Auth(Role.Researcher)
  @Post(':id/reports')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({
    summary: `Creates a report and adds it to the proposal. The report can contain up to ${REPORTS_MAX_UPLOAD_COUNT} uploads`,
  })
  @UseInterceptors(FilesInterceptor('files', REPORTS_MAX_UPLOAD_COUNT, createMulterOptions('images')))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ReportCreateWithFilesDto })
  async createReport(
    @Param() { id }: MongoIdParamDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() reportCreateDto: ReportCreateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ReportGetDto> {
    return this.proposalReportService.createReport(id, reportCreateDto, files, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Get(':id/reports')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({ summary: 'Gets all reports for a proposal' })
  async getAllReports(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest): Promise<ReportGetDto[]> {
    return this.proposalReportService.getAllReports(id, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Get(':mainId/reports/:subId/content')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiOperation({ summary: 'Get the content of one report for a proposal' })
  async getReportContent(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<string> {
    return this.proposalReportService.getReportContent(mainId, subId, user);
  }

  @Auth(Role.Researcher)
  @Put(':mainId/reports/:subId')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Item to update could not be found' })
  @ApiOperation({ summary: `Updates a report. The report can contain up to ${REPORTS_MAX_UPLOAD_COUNT} uploads` })
  @UseInterceptors(FilesInterceptor('files', REPORTS_MAX_UPLOAD_COUNT, createMulterOptions('images')))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ReportUpdateWithFilesDto })
  async updateReport(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() reportUpdateDto: ReportUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ReportGetDto> {
    return this.proposalReportService.updateReport(mainId, subId, reportUpdateDto, files, user);
  }

  @Auth(Role.Researcher)
  @Delete(':mainId/reports/:subId')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Report or proposal could not be found' })
  @ApiNoContentResponse({ description: 'Item successfully deleted. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletes a proposal report' })
  async deleteReport(@Param() { mainId, subId }: MongoTwoIdsParamDto, @Request() { user }: FdpgRequest): Promise<void> {
    return this.proposalReportService.deleteReport(mainId, subId, user);
  }
}
