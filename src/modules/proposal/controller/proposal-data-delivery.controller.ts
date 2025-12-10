// /controllers/proposal-data-delivery.controller.ts
import {
  BadRequestException,
  Body,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { DataDeliveryGetDto, DataDeliveryUpdateDto } from '../dto/proposal/data-delivery/data-delivery.dto';
import { ProposalDataDeliveryService } from '../services/data-delivery/proposal-data-delivery.service';
import { DeliveryInfoUpdateDto } from '../dto/proposal/data-delivery/delivery-info.dto';
import { SubDeliveryUpdateDto } from '../dto/proposal/data-delivery/sub-delivery.dto';
import { DeliveryAcceptance } from '../enums/data-delivery.enum';
import { ProposalGetDto } from '../dto/proposal/proposal.dto';
import { DeliveryInfoStatus } from '../enums/delivery-info-status.enum';

@ApiController('proposals', undefined, 'data-delivery')
export class ProposalDataDeliveryController {
  constructor(private readonly proposalDataDeliveryService: ProposalDataDeliveryService) {}

  // GET /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice, Role.Researcher)
  @Get(':id/data-delivery')
  @ApiOperation({ summary: 'Gets the data delivery section of a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOkResponse({ description: 'Data delivery (or null if not set)', type: DataDeliveryGetDto })
  async getDataDelivery(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto | null> {
    return await this.proposalDataDeliveryService.getDataDelivery(id, user);
  }

  // POST /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Post(':id/data-delivery')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Creates the data delivery section for a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiBadRequestResponse({ description: 'Data delivery already exists. Use update instead.' })
  @ApiCreatedResponse({ description: 'Data delivery created', type: DataDeliveryGetDto })
  @ApiBody({ type: DataDeliveryUpdateDto })
  async createDataDelivery(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: DataDeliveryUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return await this.proposalDataDeliveryService.createDataDelivery(id, dto, user);
  }

  // PUT /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/data-delivery')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Updates the data delivery section of a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal or data delivery could not be found' })
  @ApiOkResponse({ description: 'Data delivery updated', type: DataDeliveryGetDto })
  @ApiBody({ type: DataDeliveryUpdateDto })
  async updateDataDelivery(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: DataDeliveryUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return await this.proposalDataDeliveryService.updateDataDelivery(id, dto, user);
  }

  // PUT /api/proposals/:id/data-delivery/vote
  @Auth(Role.DataManagementOffice)
  @Put(':id/data-delivery/acceptance')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Sets the vote of the DMS' })
  @ApiNotFoundResponse({ description: 'Proposal/DataDelivery could not be found' })
  @ApiOkResponse({ description: 'Data delivery updated', type: DataDeliveryGetDto })
  async setDataDeliveryAcceptance(
    @Param() { id }: MongoIdParamDto,
    @Query() query: { acceptance: DeliveryAcceptance },
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return await this.proposalDataDeliveryService.setDmsVote(id, query.acceptance, user);
  }

  // PUT /api/proposals/:id/init-delivery-info
  @Auth(Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice)
  @Put(':id/init-delivery-info')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Creates a new delivery info' })
  @ApiNotFoundResponse({ description: 'Proposal/DeliveryInfo could not be found' })
  @ApiOkResponse({ description: 'Data delivery updated', type: DataDeliveryGetDto })
  @ApiBody({ type: DeliveryInfoUpdateDto })
  async initDeliveryInfo(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: DeliveryInfoUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return await this.proposalDataDeliveryService.initDeliveryInfo(id, dto, user);
  }

  // PATCH /api/proposals/:id/delivery-info/sync
  @Auth(Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice)
  @Patch(':id/delivery-info/sync')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Creates a new delivery info' })
  @ApiNotFoundResponse({ description: 'Proposal/DeliveryInfo could not be found' })
  @ApiOkResponse({ description: 'Data delivery updated', type: DataDeliveryGetDto })
  @ApiBody({ type: DeliveryInfoUpdateDto })
  async syncDeliveryInfo(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: DeliveryInfoUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return await this.proposalDataDeliveryService.syncDeliveryInfoWithDsf(id, dto, user);
  }

  // PUT /api/proposals/:id/sub-delivery/rate
  @Auth(Role.DataManagementOffice)
  @Put(':id/sub-delivery/rate')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Sets the status of one subdelivery' })
  @ApiNotFoundResponse({ description: 'Proposal/DeliveryInfo/SubDelivery could not be found' })
  @ApiOkResponse({ description: 'Sub delivery updated', type: DataDeliveryGetDto })
  @ApiBody({ type: SubDeliveryUpdateDto })
  async rateSubDelivery(
    @Param() { id }: MongoIdParamDto,
    @Query() query: { deliveryInfoId: string },
    @Body() dto: SubDeliveryUpdateDto,
  ): Promise<DataDeliveryGetDto> {
    if (!query.deliveryInfoId || !dto._id) {
      throw new BadRequestException('ids cannot be null');
    }
    return await this.proposalDataDeliveryService.rateSubDelivery(id, query.deliveryInfoId, dto._id, dto.status);
  }

  // PUT /api/proposals/:id/delivery-info/set-status
  @Auth(Role.FdpgMember, Role.DataSourceMember, Role.Researcher)
  @Put(':id/delivery-info/set-status')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Sets the state of a delivery' })
  @ApiNotFoundResponse({ description: 'Proposal/DeliveryInfo could not be found' })
  @ApiOkResponse({ description: 'Delivery Info updated', type: DataDeliveryGetDto })
  @ApiBody({ type: DeliveryInfoUpdateDto })
  async setDeliveryInfoStatus(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: DeliveryInfoUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    if (user.singleKnownRole === Role.Researcher && dto.status === DeliveryInfoStatus.FETCHED_BY_RESEARCHER) {
      return await this.proposalDataDeliveryService.setStatusToFetched(id, dto._id, user);
    } else if (
      user.singleKnownRole === Role.FdpgMember &&
      [
        DeliveryInfoStatus.PENDING,
        DeliveryInfoStatus.CANCELED,
        DeliveryInfoStatus.WAITING_FOR_DATA_SET,
        DeliveryInfoStatus.FETCHED_BY_RESEARCHER,
      ].includes(dto.status)
    ) {
      return await this.proposalDataDeliveryService.setDeliveryInfoStatus(id, dto, user);
    } else {
      throw new ForbiddenException(`User role cannot move deliveryInfo to '${dto.status}'`);
    }
  }

  // PATCH /api/proposals/:id/delivery-info/extend-delivery
  @Auth(Role.FdpgMember, Role.DataSourceMember)
  @Patch(':id/delivery-info/extend-delivery')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Sets the state of a delivery' })
  @ApiNotFoundResponse({ description: 'Proposal/DeliveryInfo could not be found' })
  @ApiOkResponse({ description: 'Delivery Info updated', type: DataDeliveryGetDto })
  @ApiBody({ type: Object })
  async extendDeliveryDate(
    @Param() { id }: MongoIdParamDto,
    @Query() query: { deliveryInfoId: string; newDeliveryDate: string },
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return await this.proposalDataDeliveryService.extendDeliveryDate(
      id,
      query.deliveryInfoId,
      new Date(query.newDeliveryDate),
      user,
    );
  }

  // PUT /api/proposals/:id/data-delivery/analysis-started
  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember)
  @Put(':id/data-delivery/analysis-started')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Marks the analysis as started and cancels all not fetched deliveries as canceled' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOkResponse({ description: 'Proposal updated', type: ProposalGetDto })
  async researcherStartedAnalysis(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalGetDto> {
    return await this.proposalDataDeliveryService.researcherStartedAnalysis(id, user);
  }
}
