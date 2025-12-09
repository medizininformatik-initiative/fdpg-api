// /controllers/proposal-data-delivery.controller.ts
import {
  BadRequestException,
  Body,
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
import { FhirService } from 'src/modules/fhir/fhir.service';
import { DeliveryInfoUpdateDto } from '../dto/proposal/data-delivery/delivery-info.dto';
import { SubDeliveryUpdateDto } from '../dto/proposal/data-delivery/sub-delivery.dto';

@ApiController('proposals', undefined, 'data-delivery')
export class ProposalDataDeliveryController {
  constructor(
    private readonly proposalDataDeliveryService: ProposalDataDeliveryService,
    private readonly fhirService: FhirService,
  ) {}

  // GET /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember, Role.DataManagementOffice, Role.Researcher)
  @Get(':id/data-delivery')
  @ApiOperation({ summary: 'Gets the data delivery section of a proposal' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOkResponse({ description: 'Data delivery (or null if not set)', type: DataDeliveryGetDto })
  async getDataDelivery(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto | null> {
    return this.proposalDataDeliveryService.getDataDelivery(id, user);
  }

  // POST /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember)
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
    return this.proposalDataDeliveryService.createDataDelivery(id, dto, user);
  }

  // PUT /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember, Role.DataManagementOffice)
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
    return this.proposalDataDeliveryService.updateDataDelivery(id, dto, user);
  }

  // PUT /api/proposals/:id/init-delivery-info
  @Auth(Role.FdpgMember, Role.DataManagementOffice)
  @Put(':id/init-delivery-info')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Creates a new delivery info' })
  @ApiNotFoundResponse({ description: 'Proposalcould not be found' })
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
  @Auth(Role.FdpgMember, Role.DataManagementOffice)
  @Patch(':id/delivery-info/sync')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Creates a new delivery info' })
  @ApiNotFoundResponse({ description: 'Proposalcould not be found' })
  @ApiOkResponse({ description: 'Data delivery updated', type: DataDeliveryGetDto })
  @ApiBody({ type: DeliveryInfoUpdateDto })
  async syncDeliveryInfo(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: DeliveryInfoUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return this.proposalDataDeliveryService.syncDeliveryInfoWithDsf(id, dto, user);
  }

  // PUT /api/proposals/:id/sub-delivery/rate
  @Auth(Role.DataManagementOffice)
  @Put(':id/sub-delivery/rate')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Sets the status of one subdelivery' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
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
    return this.proposalDataDeliveryService.rateSubDelivery(id, query.deliveryInfoId, dto._id, dto.status);
  }

  // PUT /api/proposals/:id/delivery-info/set-status
  @Auth(Role.FdpgMember)
  @Put(':id/delivery-info/set-status')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Sets the state of a delivery' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOkResponse({ description: 'Delivery Info updated', type: DataDeliveryGetDto })
  @ApiBody({ type: DeliveryInfoUpdateDto })
  async setDeliveryInfoStatus(
    @Param() { id }: MongoIdParamDto,
    @Body() dto: DeliveryInfoUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<DataDeliveryGetDto> {
    return this.proposalDataDeliveryService.setDeliveryInfoStatus(id, dto, user);
  }

  @Auth(Role.FdpgMember)
  @Post('/test')
  async test(): Promise<void> {
    const res = await this.fhirService.fetchResultUrl({
      fhirTaskId: '2f716f14-84db-4c6a-bb01-d326a051ba4f',
    } as any);
    console.log(res);
  }
}
