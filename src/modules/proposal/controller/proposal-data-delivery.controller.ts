// /controllers/proposal-data-delivery.controller.ts
import { Body, Get, Param, Post, Put, Request, UsePipes, ValidationPipe } from '@nestjs/common';
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

@ApiController('proposals', undefined, 'data-delivery')
export class ProposalDataDeliveryController {
  constructor(
    private readonly proposalDataDeliveryService: ProposalDataDeliveryService,
    private readonly fhirService: FhirService,
  ) {}

  // GET /api/proposals/:id/data-delivery
  @Auth(Role.FdpgMember)
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
  @Auth(Role.FdpgMember)
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
        // == DIC Action: Prepare CDS ==
        // (This would be run by the DIC)
        // console.log('Preparing DIC CDS store...');
        // const prepParams = {
        //   projectIdentifier: 'Test_PROJECT_ZIP',
        //   organizationIdentifier: 'diz-1.test.fdpg.forschen-fuer-gesundheit.de',
        //   base64Data: 'SGVsbG8sIFdvcmxkIQ==', // "Hello, World!"
        //   contentType: 'text/csv',
        //   // UUIDs will be auto-generated
        // };
        // await this.fhirService.prepareCdsDecentralizedJson(prepParams);
        // console.log('DIC CDS store prepared.');

        // == HRP Action: Start Coordinate Process ==
        // (This would be run by the HRP)
        console.log('Starting coordination process on HRP...');

        const ts = this.formatCurrentDateForCode();
        const startParams = {
          hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
          projectIdentifier: `Test_PROJECT_ZIP_local_dev_${ts}`,
          contractUrl: `http://example.com/contract/Test_PROJECT_ZIP_${ts}`,
          dmsIdentifier: 'forschen-fuer-gesundheit.de', // Using HRP as DMS for testing
          researcherIdentifiers: ['researcher-1', 'researcher-2'],
          dicIdentifiers: ['diz-1.test.fdpg.forschen-fuer-gesundheit.de'],
          extractionPeriod: 'P28D', // <REPLACE-WITH-EXTRACTION-PERIOD> with initial maximum extraction period the DIC sites have time to deliver the results to the DMS. Given in ISO8601 duration format (default P28D )
        };
        const createdTask = await this.fhirService.startCoordinateProcessJson(startParams);

        // == create task and get business key
        console.log(JSON.stringify(createdTask));
        console.log('Process started. Main Task ID:', createdTask.id);

        const getTask = await this.fhirService.getTaskById(createdTask.id);
        console.log(JSON.stringify(getTask));
        // ======

        // == HRP Action: Poll for results ==
        console.log('Polling for received data sets...');
        const dataSetTasks = await this.fhirService.pollForReceivedDataSets();
        console.log('Found tasks:', dataSetTasks);

        // ... subsequent polling and answering steps would follow ...
      } catch (error) {
        console.error('An error occurred during the process:', error.message);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
