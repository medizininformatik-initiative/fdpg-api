// /controllers/proposal-data-delivery.controller.ts
import { Body, Get, Param, Patch, Post, Put, Request, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { ProposalDataDeliveryService } from '../services/proposal-data-delivery.service';
import { FhirService } from 'src/modules/fhir/fhir.service';
import { DeliveryInfoUpdateDto } from '../dto/proposal/data-delivery/delivery-info.dto';

@ApiController('proposals', undefined, 'data-delivery')
export class ProposalDataDeliveryController {
  constructor(
    private readonly proposalDataDeliveryService: ProposalDataDeliveryService,
    private readonly fhirService: FhirService,
  ) {}

  // GET /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember, Role.DataManagementOffice)
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
  @Auth(Role.FdpgMember, Role.DataManagementOffice)
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

  // POST /api/proposals/:id/init-delivery-info
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
    console.log({ id, dto, user });
    return this.proposalDataDeliveryService.initDeliveryInfo(id, dto, user);
  }

  // POST /api/proposals/:id/init-delivery-info
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

  formatCurrentDateForCode() {
    const now = new Date();

    // Helper function to pad a number with a leading zero
    const pad = (num) => String(num).padStart(2, '0');

    // Month is 0-indexed, so we add 1
    const month = pad(now.getMonth() + 1);

    // Day of the month
    const day = pad(now.getDate());

    // Hour (24-hour format)
    const hour = pad(now.getHours());

    // Minute
    const minute = pad(now.getMinutes());

    return `${day}${month}T${hour}${minute}`;
  }

  @Auth(Role.FdpgMember)
  @UsePipes(ValidationPipe)
  @Get(':id/test')
  async test(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest): Promise<void> {
    try {
      try {
        // const ts = this.formatCurrentDateForCode();
        // const startParams = {
        //   hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
        //   projectIdentifier: `Test_PROJECT_ZIP_local_dev_${ts}`,
        //   contractUrl: `http://example.com/contract/Test_PROJECT_ZIP_${ts}`,
        //   dmsIdentifier: 'dms.test.forschen-fuer-gesundheit.de',
        //   researcherIdentifiers: ['researcher-1', 'researcher-2'],
        //   dicIdentifiers: ['diz-1.test.fdpg.forschen-fuer-gesundheit.de'],
        //   extractionPeriod: 'P28D',
        //   businessKey: v4(),
        // };
        // const createdTask = await this.fhirService.startCoordinateDataSharingProcess(startParams);

        // == HRP Action: Poll for results ==
        console.log('Polling for received data sets...');
        const dataSetTasks = await this.fhirService.pollForReceivedDataSetsByBusinessKey();
        console.log('Found tasks:', JSON.stringify(dataSetTasks));

        // ... subsequent polling and answering steps would follow ...
      } catch (error) {
        console.error('An error occurred during the process:', error.message);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
