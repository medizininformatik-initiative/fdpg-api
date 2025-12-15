import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { FhirClient } from '../fhir.client';
import { FhirReceivedDataSetType } from '../type/fhir-received-dataset.type';
import { FhirHelpersUtil } from '../util/fhir-helpers.util';
import { mapTaskTableResponse } from '../util/fhir-received-dataset.util';
import { FHIR_SYSTEM_CONSTANTS } from '../constants/fhir-constants';
import { FhirTaskCoordinateSharingPayloadFactory } from './fhir-task-coordinate-sharing-payload.factory';

@Injectable()
export class DsfTaskService {
  constructor(private readonly fhirClient: FhirClient) {
    this.apiClient = this.fhirClient.client;
  }

  private apiClient: AxiosInstance;
  private readonly logger = new Logger(DsfTaskService.name);
  private readonly MAX_PAGINATION_REQUEST_COUNT = 10;

  async startCoordinateDataSharingProcess({
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
    this.logger.verbose(`Creating task with business key ... '${businessKey}'`);

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

    const task = FhirTaskCoordinateSharingPayloadFactory.createStartProcessPayload(payloadArgs);

    try {
      const response = await this.apiClient.post('/Task', task);
      this.logger.verbose('Successfully started coordinate process. Task created:', response.data.id);
      return response.data;
    } catch (error) {
      this.logger.error('Error starting coordinate process :', JSON.stringify(error.response?.data || error.message));
      throw Error('Clould not initiate process');
    }
  }

  private async getTaskById(taskId: string): Promise<any> {
    const response = await this.apiClient.get(`/Task/${taskId}`);

    return response.data;
  }

  async getResultUrlByTaskId(fhirTaskId: string): Promise<string | undefined> {
    const task = await this.getTaskById(fhirTaskId);
    if (!task.output || !Array.isArray(task.output)) {
      return undefined;
    }

    const dataSetOutput = task.output.find((outputItem) =>
      outputItem.type?.coding?.some((coding) => coding.code === 'data-set-url'),
    );

    return dataSetOutput?.valueUrl;
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
          const pageDataSets = rawEntries.map((entry) => mapTaskTableResponse(entry, FHIR_SYSTEM_CONSTANTS));
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
