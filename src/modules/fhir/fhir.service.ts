import { ForbiddenException, Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { FhirClient } from './fhir.client';
import { DeliveryInfo } from '../proposal/schema/sub-schema/data-delivery/delivery-info.schema';
import { Proposal } from '../proposal/schema/proposal.schema';
import { LocationService } from '../location/service/location.service';
import { processReceivedDataSetResponse } from './util/fhir-received-dataset.util';
import { FhirReceivedDataSetType } from './type/fhir-received-dataset.type';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class FhirService {
  constructor(
    private fhirClient: FhirClient,
    private locationService: LocationService,
  ) {
    this.apiClient = this.fhirClient.client;
  }

  private readonly BUSINESS_KEY_CODE = 'business-key';
  private readonly GET_TASK_DELAY_MS = 3 * 1000;

  private readonly INPUT_CODE_MAPPINGS = {
    // For "message-name" and "business-key", we map to a single target key
    // and specify the path to the string value (valueString).
    'message-name': {
      targetKey: 'message-name',
      valuePath: 'valueString',
    },
    [this.BUSINESS_KEY_CODE]: {
      targetKey: this.BUSINESS_KEY_CODE,
      valuePath: 'valueString',
    },
    'dic-identifier': [
      {
        targetKey: 'dic-identifier-value',
        valuePath: 'valueReference.identifier.value',
      },
    ],
  };

  private apiClient: AxiosInstance;

  private async fetchBusinessKey(dataDelivery: DeliveryInfo): Promise<string> {
    if (!dataDelivery.fhirTaskId) {
      throw new Error(`No Task Id given for delivery ${dataDelivery.name}`);
    }

    const getTask = await this.getTaskById(dataDelivery.fhirTaskId);
    console.log('GET TASK');
    console.log(JSON.stringify(getTask));

    const businessKeyEntry = getTask.input.find((entry) =>
      entry.type.coding.some((coding) => coding.code === this.BUSINESS_KEY_CODE),
    );

    console.log(`Business Key: ${businessKeyEntry}`);

    if (!businessKeyEntry || !businessKeyEntry.valueString) {
      throw new Error(
        `Business key not present for dataDelivery ${dataDelivery.name} and taskId ${dataDelivery.fhirTaskId}`,
      );
    }

    return businessKeyEntry.valueString;
  }

  async createTask(deliveryInfo: DeliveryInfo, proposal: Proposal): Promise<DeliveryInfo> {
    const locationMap = this.locationService.findAllLookUpMap();
    console.log('Starting coordination process on HRP...');

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

    const startParams = {
      hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
      projectIdentifier: proposal.projectAbbreviation,
      contractUrl: `http://example.com/contract/Test_PROJECT_ZIP_${proposal.projectAbbreviation}`, // MARIE FRAGEN?
      dmsIdentifier: dms.uri, //'forschen-fuer-gesundheit.de', // Using HRP as DMS for testing //dms.test.forschen-fuer-gesundheit.de
      researcherIdentifiers: ['researcher-1', 'researcher-2'], // email von researchers?
      dicIdentifiers: dicLocations, // diz-1.test.fdpg.forschen-fuer-gesundheit.de
      extractionPeriod: 'P28D', // <REPLACE-WITH-EXTRACTION-PERIOD> with initial maximum extraction period the DIC sites have time to deliver the results to the DMS. Given in ISO8601 duration format (default P28D )
      businessKey,
    };
    const createdTask = await this.startCoordinateProcessJson(startParams);
    deliveryInfo.fhirTaskId = createdTask.id;
    deliveryInfo.fhirBusinessKey = businessKey;

    return deliveryInfo;
  }

  async startCoordinateProcessJson({
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
    console.log(`Creating task with id ... ${businessKey}`);

    const task = {
      resourceType: 'Task',
      meta: {
        profile: ['http://medizininformatik-initiative.de/fhir/StructureDefinition/task-coordinate-data-sharing|1.1'],
      },
      instantiatesCanonical: 'http://medizininformatik-initiative.de/bpe/Process/coordinateDataSharing|1.1',
      status: 'requested',
      intent: 'order',
      authoredOn: dateTime,
      requester: {
        type: 'Organization',
        identifier: {
          system: 'http://dsf.dev/sid/organization-identifier',
          value: hrpOrganizationIdentifier,
        },
      },
      restriction: {
        recipient: [
          {
            type: 'Organization',
            identifier: {
              system: 'http://dsf.dev/sid/organization-identifier',
              value: hrpOrganizationIdentifier,
            },
          },
        ],
      },
      input: [
        {
          type: {
            coding: [
              {
                system: 'http://dsf.dev/fhir/CodeSystem/bpmn-message',
                code: this.BUSINESS_KEY_CODE,
              },
            ],
          },
          valueString: businessKey,
        },
        {
          type: {
            coding: [
              {
                system: 'http://dsf.dev/fhir/CodeSystem/bpmn-message',
                code: 'message-name',
              },
            ],
          },
          valueString: 'coordinateDataSharing',
        },
        {
          type: {
            coding: [
              {
                system: 'http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing',
                code: 'project-identifier',
              },
            ],
          },
          valueIdentifier: {
            system: 'http://medizininformatik-initiative.de/sid/project-identifier',
            value: projectIdentifier,
          },
        },
        {
          type: {
            coding: [
              {
                system: 'http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing',
                code: 'extraction-period',
              },
            ],
          },
          valueString: extractionPeriod,
        },
        {
          type: {
            coding: [
              {
                system: 'http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing',
                code: 'contract-url',
              },
            ],
          },
          valueUrl: contractUrl,
        },
        // Researcher Identifiers
        ...researcherIdentifiers.map((id) => ({
          type: {
            coding: [
              {
                system: 'http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing',
                code: 'researcher-identifier',
              },
            ],
          },
          valueIdentifier: {
            system: 'http://medizininformatik-initiative.de/sid/researcher-identifier',
            value: id,
          },
        })),
        // DIC Identifiers
        ...dicIdentifiers.map((id) => ({
          type: {
            coding: [
              {
                system: 'http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing',
                code: 'dic-identifier',
              },
            ],
          },
          valueReference: {
            type: 'Organization',
            identifier: {
              system: 'http://dsf.dev/sid/organization-identifier',
              value: id,
            },
          },
        })),
        // DMS Identifier
        {
          type: {
            coding: [
              {
                system: 'http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing',
                code: 'dms-identifier',
              },
            ],
          },
          valueReference: {
            type: 'Organization',
            identifier: {
              system: 'http://dsf.dev/sid/organization-identifier',
              value: dmsIdentifier,
            },
          },
        },
      ],
    };

    try {
      const response = await this.apiClient.post('/Task', task);
      console.log('Successfully started coordinate process (JSON). Task created:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Error starting coordinate process (JSON):', error.response?.data || error.message);
      throw error;
    }
  }

  async getTaskById(taskId: string): Promise<any> {
    const response = await this.apiClient.get(`/Task/${taskId}`, {
      headers: this.fhirClient.FHIR_JSON_HEADERS,
    });

    return response.data;
  }

  /**
   * 4. Polls for 'TaskReceivedDataSet' Tasks.
   * Fetches Tasks with the specific profile, sorted by last updated.
   *
   */
  async pollForReceivedDataSetsByBusinessKey(lastSync: Date): Promise<FhirReceivedDataSetType> {
    try {
      const response = await this.apiClient.get('/Task', {
        params: {
          _profile: 'http://medizininformatik-initiative.de/fhir/StructureDefinition/task-received-data-set|1.1',
          _sort: '-_lastUpdated',
          _lastUpdated: `ge${lastSync.toISOString()}`,
        },
      });
      console.log(`Found ${response.data.total} 'Received Data Set' tasks.`);
      return response.data; // This is a FHIR Bundle
    } catch (error) {
      console.error('Error polling for received data sets:', error.response?.data || error.message);
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
      console.log(`Found ${response.data.total} 'Received Data Set' tasks.`);
      return response.data.entry.map((entry) => processReceivedDataSetResponse(entry, this.INPUT_CODE_MAPPINGS));
    } catch (error) {
      console.error('Error polling for received data sets:', error.response?.data || error.message);
      throw error;
    }
  }
}
