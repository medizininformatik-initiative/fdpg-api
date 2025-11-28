import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { FhirClient } from './fhir.client';
import { DeliveryInfo } from '../proposal/schema/sub-schema/data-delivery/delivery-info.schema';
import { Proposal } from '../proposal/schema/proposal.schema';
import { LocationService } from '../location/service/location.service';
import { processReceivedDataSetResponse } from './util/fhir-received-dataset.util';
import { FhirReceivedDataSetType } from './type/fhir-received-dataset.type';
import { v4 as uuidV4 } from 'uuid';
import { FhirTaskCoordinateSharingPayloadFactory } from './factory/fhir-task-coordinate-sharing-payload.factory';
import { FHIR_SYSTEM_CONSTANTS } from './constants/fhir-constants';
import { FhirHelpersUtil } from './util/fhir-helpers.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FhirService {
  constructor(
    private fhirClient: FhirClient,
    private locationService: LocationService,
    private configService: ConfigService,
  ) {
    this.apiClient = this.fhirClient.client;
    this.FRONTEND_URL = this.configService.get('FRONTEND_URL');
    this.IS_FHIR_TEST = !!this.configService.get('IS_FHIR_TEST', 'false') === 'true';

    if (this.IS_FHIR_TEST) {
      this.logger.warn('FHIR TESTING IS ENABLED');
    }
  }

  private readonly logger = new Logger(FhirService.name);
  private readonly MAX_PAGINATION_REQUEST_COUNT = 10;
  private apiClient: AxiosInstance;
  private FRONTEND_URL: string;
  private IS_FHIR_TEST = false;

  async createCoordinateDataSharingTask(deliveryInfo: DeliveryInfo, proposal: Proposal): Promise<DeliveryInfo> {
    const locationMap = await this.locationService.findAllLookUpMap();

    const dms = locationMap[proposal.dataDelivery.dataManagementSite];
    const dicLocations = deliveryInfo.subDeliveries.map((delivery) => {
      const location = locationMap[delivery.location];

      if (!location || !location.uri) {
        throw new NotFoundException(`Location or URI not found for subDelivery location ID: ${delivery.location}`);
      }

      return location;
    });

    if (!dms.dataManagementCenter) {
      throw new ForbiddenException(`Location ${dms._id} is not a DMS`);
    }

    const notDicLocations = dicLocations.filter((loc) => !loc.dataIntegrationCenter);

    if (notDicLocations.length > 0) {
      throw new ForbiddenException(`Locations ${notDicLocations} aren't data integration locations`);
    }

    const businessKey = uuidV4();

    const extractionPeriod = FhirHelpersUtil.getExtractionPeriod(new Date(), new Date(deliveryInfo.deliveryDate));

    const researcherEmails = [
      proposal.applicant?.researcher?.email ?? 'applicant_mail_not_found@invalid.com',
      ...(proposal.participants || []).map((p) => p.researcher.email),
    ];

    const startParams = {
      hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
      projectIdentifier: proposal.projectAbbreviation,
      contractUrl: `${this.FRONTEND_URL}/proposals/${proposal._id}/details`,
      dmsIdentifier: dms.uri,
      researcherIdentifiers: researcherEmails,
      dicIdentifiers: dicLocations.map((dic) => dic.uri),
      extractionPeriod,
      businessKey,
    };

    const createdTask = await this.startCoordinateDataSharingProcess(startParams);
    deliveryInfo.fhirTaskId = createdTask.id;
    deliveryInfo.fhirBusinessKey = businessKey;

    return deliveryInfo;
  }

  private async startCoordinateDataSharingProcess({
    businessKey,
    hrpOrganizationIdentifier,
    projectIdentifier,
    contractUrl,
    dmsIdentifier,
    researcherIdentifiers = [],
    dicIdentifiers = [],
    extractionPeriod = 'P28D',
    dateTime = new Date().toISOString(),
  }) {
    this.logger.verbose(`Creating task with business key ... ${businessKey}`);

    const payloadArgs = {
      businessKey,
      hrpOrganizationIdentifier,
      projectIdentifier,
      contractUrl,
      dmsIdentifier,
      researcherIdentifiers,
      dicIdentifiers,
      extractionPeriod,
      dateTime,
    };

    if (this.IS_FHIR_TEST) {
      this.logger.warn('FHIR TESTING ARGUMENTS ARE ENABLED. The client will not use actual DMS and DIC identifiers.');

      payloadArgs.dmsIdentifier = 'dms.test.forschen-fuer-gesundheit.de';
      this.logger.warn(`OVERRIDEN DMS IDENTIFIER ${payloadArgs.dmsIdentifier}`);
      payloadArgs.dicIdentifiers = ['diz-1.test.fdpg.forschen-fuer-gesundheit.de'];
      this.logger.warn(`OVERRIDEN DIC IDENTIFIER ${payloadArgs.dicIdentifiers}`);
    }

    const task = FhirTaskCoordinateSharingPayloadFactory.createStartProcessPayload(payloadArgs);

    console.log(JSON.stringify(task));

    try {
      const response = await this.apiClient.post('/Task', task);
      this.logger.verbose('Successfully started coordinate process. Task created:', response.data.id);
      return response.data;
    } catch (error) {
      this.logger.error('Error starting coordinate process :', JSON.stringify(error.response?.data || error.message));
      throw Error('Clould not initiate process');
      // throw error;
    }
  }

  async getTaskById(taskId: string): Promise<any> {
    const response = await this.apiClient.get(`/Task/${taskId}`, {
      headers: this.fhirClient.FHIR_JSON_HEADERS,
    });

    return response.data;
  }

  async pollForReceivedDataSetsByBusinessKey(
    businessKey?: string,
    lastSync?: Date,
  ): Promise<FhirReceivedDataSetType[]> {
    const processedDataSets: FhirReceivedDataSetType[] = [];
    let requestCount = 0;

    if (!businessKey) {
      this.logger.warn('Business key not given. Returning all received data set results');
    }

    const initialParams = {
      _profile: 'http://medizininformatik-initiative.de/fhir/StructureDefinition/task-received-data-set|1.1',
      _sort: '-_lastUpdated',
      _lastUpdated: lastSync ? `ge${FhirHelpersUtil.subtractOneHour(lastSync).toISOString()}` : undefined,
    };

    try {
      const paginator = FhirHelpersUtil.paginateFhirTaskGenerator(this.apiClient, initialParams, '/Task');

      for await (const rawEntries of paginator) {
        requestCount++;

        if (rawEntries && rawEntries.length > 0) {
          const pageDataSets = rawEntries.map((entry) => processReceivedDataSetResponse(entry, FHIR_SYSTEM_CONSTANTS));
          processedDataSets.push(...pageDataSets);
        }

        this.logger.verbose(
          `Page ${requestCount} fetched. Found ${rawEntries?.length || 0} tasks. ` +
            `Total processed data sets collected: ${processedDataSets.length}`,
        );

        if (requestCount >= this.MAX_PAGINATION_REQUEST_COUNT) {
          this.logger.warn(
            `Reached maximum request count (${this.MAX_PAGINATION_REQUEST_COUNT}) for business key '${'' + businessKey}'. Stopping polling.`,
          );
          break;
        }
      }
    } catch (error) {
      this.logger.error('Error polling for received data sets:', error.response?.data || error.message);
      throw error;
    }

    const filteredByBusinessKey = processedDataSets.filter((dataSet) =>
      businessKey ? dataSet['business-key'] === businessKey : true,
    );

    this.logger.verbose(
      `Finished polling. Total data sets found: ${processedDataSets.length}. Filtered by business key: ${filteredByBusinessKey.length}`,
    );

    return filteredByBusinessKey;
  }
}
