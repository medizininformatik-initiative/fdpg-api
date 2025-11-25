import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { FhirClient } from './fhir.client';
import { DeliveryInfo } from '../proposal/schema/sub-schema/data-delivery/delivery-info.schema';
import { Proposal } from '../proposal/schema/proposal.schema';
import { LocationService } from '../location/service/location.service';
import { processReceivedDataSetResponse } from './util/fhir-received-dataset.util';
import { FhirReceivedDataSetType } from './type/fhir-received-dataset.type';
import { v4 as uuidV4 } from 'uuid';
import { DateTime, Interval } from 'luxon';
import { FhirTaskCoordinateSharingPayloadFactory } from './factory/fhir-task-coordinate-sharing-payload.factory';
import { FHIR_SYSTEM_CONSTANTS } from './constants/fhir-constants';

@Injectable()
export class FhirService {
  constructor(
    private fhirClient: FhirClient,
    private locationService: LocationService,
    private fhirTaskCreationPayloadFactory: FhirTaskCoordinateSharingPayloadFactory,
  ) {
    this.apiClient = this.fhirClient.client;
  }

  private readonly logger = new Logger(FhirService.name);
  private apiClient: AxiosInstance;

  /**
   * Calculates the ISO 8601 period duration string
   */
  private getExtractionPeriod(startDate: Date, endDate: Date): string {
    const startOriginal = DateTime.fromJSDate(startDate);
    const endOriginal = DateTime.fromJSDate(endDate);

    const startAdjusted = startOriginal.endOf('day');
    const endAdjusted = endOriginal.endOf('day');

    const interval = Interval.fromDateTimes(startAdjusted, endAdjusted);

    const duration = interval.toDuration(['years', 'months', 'days']);

    return duration.toISO();
  }

  async createCoordinateDataSharingTask(deliveryInfo: DeliveryInfo, proposal: Proposal): Promise<DeliveryInfo> {
    const locationMap = this.locationService.findAllLookUpMap();

    const dms = locationMap[proposal.dataDelivery.dataManagementSite];
    const dicLocations = deliveryInfo.subDeliveries
      .map((delivery) => locationMap[delivery.location])
      .map((location) => location.uri);

    if (!dms.dataManagementCenter) {
      throw new ForbiddenException(`Location ${dms._id} is not a DMS`);
    }

    const notDicLocations = dicLocations.filter((loc) => !loc.dataIntegrationCenter);

    if (notDicLocations.length > 0) {
      throw new ForbiddenException(`Locations ${notDicLocations} aren't data integration locations`);
    }

    const businessKey = uuidV4();

    const extractionPeriod = this.getExtractionPeriod(new Date(), deliveryInfo.date);

    const startParams = {
      hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
      projectIdentifier: proposal.projectAbbreviation,
      contractUrl: `http://example.com/contract/Test_PROJECT_ZIP_${proposal.projectAbbreviation}`, // MARIE FRAGEN?
      dmsIdentifier: dms.uri,
      researcherIdentifiers: ['researcher-1', 'researcher-2'], // email von researchers?
      dicIdentifiers: dicLocations,
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

    const task = this.fhirTaskCreationPayloadFactory.createStartProcessPayload({
      businessKey,
      hrpOrganizationIdentifier,
      projectIdentifier,
      contractUrl,
      dmsIdentifier,
      researcherIdentifiers,
      dicIdentifiers,
      extractionPeriod,
      dateTime,
    });

    try {
      const response = await this.apiClient.post('/Task', task);
      this.logger.verbose('Successfully started coordinate process (JSON). Task created:', response.data.id);
      return response.data;
    } catch (error) {
      this.logger.error('Error starting coordinate process (JSON):', error.response?.data || error.message);
      throw error;
    }
  }

  async getTaskById(taskId: string): Promise<any> {
    const response = await this.apiClient.get(`/Task/${taskId}`, {
      headers: this.fhirClient.FHIR_JSON_HEADERS,
    });

    return response.data;
  }

  async pollForReceivedDataSetsByBusinessKey(lastSync: Date): Promise<FhirReceivedDataSetType> {
    try {
      const response = await this.apiClient.get('/Task', {
        params: {
          _profile: 'http://medizininformatik-initiative.de/fhir/StructureDefinition/task-received-data-set|1.1',
          _sort: '-_lastUpdated',
          _lastUpdated: `ge${lastSync.toISOString()}`,
        },
      });
      this.logger.verbose(`Found ${response.data.total} 'Received Data Set' tasks.`);
      return response.data; // This is a FHIR Bundle
    } catch (error) {
      this.logger.error('Error polling for received data sets:', error.response?.data || error.message);
      throw error;
    }
  }

  async pollForReceivedDataSets(): Promise<FhirReceivedDataSetType> {
    try {
      const response = await this.apiClient.get('/Task', {
        params: {
          _profile: 'http://medizininformatik-initiative.de/fhir/StructureDefinition/task-received-data-set|1.1',
          _sort: '-_lastUpdated',
        },
      });
      this.logger.verbose(`Found ${response.data.total} 'Received Data Set' tasks.`);
      return response.data.entry.map((entry) => processReceivedDataSetResponse(entry, FHIR_SYSTEM_CONSTANTS));
    } catch (error) {
      this.logger.error('Error polling for received data sets:', error.response?.data || error.message);
      throw error;
    }
  }
}
