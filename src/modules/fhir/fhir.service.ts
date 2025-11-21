import { ForbiddenException, Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { FhirClient } from './fhir.client';
import { DeliveryInfo } from '../proposal/schema/sub-schema/data-delivery/delivery-info.schema';
import { Proposal } from '../proposal/schema/proposal.schema';
import { LocationService } from '../location/service/location.service';

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

    const startParams = {
      hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
      projectIdentifier: proposal.projectAbbreviation,
      contractUrl: `http://example.com/contract/Test_PROJECT_ZIP_${proposal.projectAbbreviation}`,
      dmsIdentifier: dms.uri, //'forschen-fuer-gesundheit.de', // Using HRP as DMS for testing
      researcherIdentifiers: ['researcher-1', 'researcher-2'],
      dicIdentifiers: dicLocations,
      extractionPeriod: 'P28D', // <REPLACE-WITH-EXTRACTION-PERIOD> with initial maximum extraction period the DIC sites have time to deliver the results to the DMS. Given in ISO8601 duration format (default P28D )
    };
    const createdTask = await this.startCoordinateProcessJson(startParams);

    console.log(JSON.stringify(createdTask));
    console.log('Process started. Main Task ID:', createdTask.id);

    deliveryInfo.fhirTaskId = createdTask.id;

    const businessKey = await new Promise<string>((resolve, reject) =>
      // Delay needed since DSF doesn't create the business key right away
      setTimeout(async () => {
        try {
          const bk = await this.fetchBusinessKey(deliveryInfo);
          if (!bk) {
            reject(new Error(`Business key for Task ${createdTask.id} is not present`));
            return;
          }

          resolve(bk);
        } catch (e) {
          reject(e);
        }
      }, this.GET_TASK_DELAY_MS),
    );

    deliveryInfo.fhirBusinessKey = businessKey;

    return deliveryInfo;
  }

  async startCoordinateProcessJson({
    hrpOrganizationIdentifier,
    projectIdentifier,
    contractUrl,
    dmsIdentifier,
    researcherIdentifiers = [],
    dicIdentifiers = [],
    extractionPeriod = 'P28D',
    dateTime = new Date().toISOString(),
  }) {
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

  async startCoordinateProcessXml({
    hrpOrganizationIdentifier,
    projectIdentifier,
    contractUrl,
    dmsIdentifier,
    researcherIdentifiers = [],
    dicIdentifiers = [],
    extractionPeriod = 'P28D',
    dateTime = new Date().toISOString(),
  }) {
    // --- Helper strings for dynamic inputs ---

    // 1. Create XML blocks for Researcher Identifiers
    const researcherInputs = researcherIdentifiers
      .map(
        (id) => `
    <input>
        <type>
            <coding>
                <system value="http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing"/>
                <code value="researcher-identifier"/>
            </coding>
        </type>
        <valueIdentifier>
            <system value="http://medizininformatik-initiative.de/sid/researcher-identifier"/>
            <value value="${id}"/>
        </valueIdentifier>
    </input>`,
      )
      .join('\n');

    // 2. Create XML blocks for DIC Identifiers
    const dicInputs = dicIdentifiers
      .map(
        (id) => `
    <input>
        <type>
            <coding>
                <system value="http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing"/>
                <code value="dic-identifier"/>
            </coding>
        </type>
        <valueReference>
            <type value="Organization"/>
            <identifier>
                <system value="http://dsf.dev/sid/organization-identifier"/>
                <value value="${id}"/>
            </identifier>
        </valueReference>
    </input>`,
      )
      .join('\n');

    // --- 3. Build the full XML Task string ---
    const xmlData = `
<Task xmlns="http://hl7.org/fhir">
    <meta>
        <profile value="http://medizininformatik-initiative.de/fhir/StructureDefinition/task-coordinate-data-sharing|1.1"/>
    </meta>
    <instantiatesCanonical value="http://medizininformatik-initiative.de/bpe/Process/coordinateDataSharing|1.1"/>
    <status value="requested"/>
    <intent value="order"/>
    <authoredOn value="${dateTime}"/>
    <requester>
        <type value="Organization"/>
        <identifier>
            <system value="http://dsf.dev/sid/organization-identifier"/>
            <value value="${hrpOrganizationIdentifier}"/>
        </identifier>
    </requester>
    <restriction>
        <recipient>
            <type value="Organization"/>
            <identifier>
                <system value="http://dsf.dev/sid/organization-identifier"/>
                <value value="${hrpOrganizationIdentifier}"/>
            </identifier>
        </recipient>
    </restriction>
    <input>
        <type>
            <coding>
                <system value="http://dsf.dev/fhir/CodeSystem/bpmn-message"/>
                <code value="message-name"/>
            </coding>
        </type>
        <valueString value="coordinateDataSharing"/>
    </input>
    <input>
        <type>
            <coding>
                <system value="http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing"/>
                <code value="project-identifier"/>
            </coding>
        </type>
        <valueIdentifier>
            <system value="http://medizininformatik-initiative.de/sid/project-identifier"/>
            <value value="${projectIdentifier}"/>
        </valueIdentifier>
    </input>
    <input>
        <type>
            <coding>
                <system value="http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing"/>
                <code value="extraction-period"/>
            </coding>
        </type>
        <valueString value="${extractionPeriod}"/>
    </input>
    <input>
        <type>
            <coding>
                <system value="http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing"/>
                <code value="contract-url"/>
            </coding>
        </type>
        <valueUrl value="${contractUrl}"/>
    </input>

    ${researcherInputs}

    ${dicInputs}

    <input>
        <type>
            <coding>
                <system value="http://medizininformatik-initiative.de/fhir/CodeSystem/data-sharing"/>
                <code value="dms-identifier"/>
            </coding>
        </type>
        <valueReference>
            <type value="Organization"/>
            <identifier>
                <system value="http://dsf.dev/sid/organization-identifier"/>
                <value value="${dmsIdentifier}"/>
            </identifier>
        </valueReference>
    </input>
</Task>
  `;

    console.log(`created xml: \n ${xmlData}`);

    // --- 4. Send the XML request ---
    try {
      const response = await this.apiClient.post('/Task', xmlData, {
        headers: this.fhirClient.FHIR_XML_HEADERS,
      });
      // Note: The response from the server might be JSON or XML
      // depending on your apiClient's default 'Accept' header
      // or the server's configuration.
      console.log('Successfully started coordinate process (XML). Task created.');
      return response.data;
    } catch (error) {
      console.error('Error starting coordinate process (XML):', error.response?.data || error.message);
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
  async pollForReceivedDataSetsByBusinessKey(businessKey: string, lastSync: Date) {
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

  async pollForReceivedDataSets() {
    try {
      const response = await this.apiClient.get('/Task', {
        params: {
          _profile: 'http://medizininformatik-initiative.de/fhir/StructureDefinition/task-received-data-set|1.1',
          _sort: '-_lastUpdated',
        },
      });
      console.log(`Found ${response.data.total} 'Received Data Set' tasks.`);
      return response.data; // This is a FHIR Bundle
    } catch (error) {
      console.error('Error polling for received data sets:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 5. Polls for 'in-progress' QuestionnaireResponses to release consolidation.
   *
   * @returns {Promise<object>} The FHIR Bundle of matching QuestionnaireResponse resources.
   */
  async pollForConsolidationQuestionnaire() {
    try {
      const response = await this.apiClient.get('/QuestionnaireResponse', {
        params: {
          status: 'in-progress',
          _sort: '-_lastUpdated',
          // You might want to filter by questionnaire canonical URL if you know it
        },
      });
      console.log(`Found ${response.data.total} 'in-progress' questionnaires.`);
      return response.data; // This is a FHIR Bundle
    } catch (error) {
      console.error('Error polling for consolidation questionnaire:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 6. Answers a 'ReleaseConsolidateDataSets' QuestionnaireResponse.
   * This function is generic; you must build the correct QuestionnaireResponse body.
   * It performs a PUT to update the resource.
   *
   * @param {object} axiosInstance - Your pre-configured Axios instance for the HRP DSF.
   * @param {string} dsfFhirBaseUrl - The base URL of the HRP DSF FHIR server.
   * @param {string} questionnaireResponseId - The ID of the QuestionnaireResponse to update.
   * @param {string} questionnaireResponseBody - The full XML body of the completed QuestionnaireResponse.
   * @returns {Promise<object>} The updated QuestionnaireResponse resource.
   */
  async answerConsolidationQuestionnaire(questionnaireResponseId, questionnaireResponseBody) {
    try {
      // Note: The resource body you send MUST have the status changed
      // from 'in-progress' to 'completed'.
      const response = await this.apiClient.put(
        `/QuestionnaireResponse/${questionnaireResponseId}`,
        questionnaireResponseBody,
      );
      console.log('Successfully answered consolidation questionnaire.');
      return response.data;
    } catch (error) {
      console.error('Error answering consolidation questionnaire:', error.response?.data || error.message);
      throw error;
    }
  }
}
