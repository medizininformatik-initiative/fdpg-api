import { Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { FhirClient } from './fhir.client';
import { FhirAuthenticationClient } from './fhir-authentication.client';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FhirService {
  constructor(
    private fhirClient: FhirClient,
    private fhirAuth: FhirAuthenticationClient,
  ) {
    this.apiClient = this.fhirClient.client;
    this.auth = this.fhirAuth;
  }

  private apiClient: AxiosInstance;
  private auth: FhirAuthenticationClient;

  async test() {
    const result = await this.apiClient.get(
      //   '/Task?_profile=http://medizininformatik-initiative.de/fhir/StructureDefinition/task-received-data-set|1.1&_sort=-_lastUpdated',
      '/Task',
      {
        headers: {
          'Content-Type': 'application/fhir+xml',
        },
      },
    );

    console.log({ data: JSON.stringify(result.data.entry) });
  }

  /**
   * 1. Prepares the DIC CDS FHIR store (Decentralized) using JSON.
   *
   * @param {object} params - Parameters for the transaction.
   * @param {string} params.projectIdentifier - The project identifier.
   * @param {string} params.organizationIdentifier - Your DIC organization identifier.
   * @param {string} params.base64Data - The base64-encoded file content.
   * @param {string} params.contentType - The MIME type of the data.
   * @param {string} [params.docRefUuid] - Optional UUID (still required, see below).
   * @param {string} [params.binaryUuid] - Optional UUID (still required, see below).
   * @param {string} [params.dateTime] - Optional ISO 8601 datetime string.
   * @returns {Promise<object>} The FHIR response data from the server.
   */
  async prepareCdsDecentralizedJson({
    projectIdentifier,
    organizationIdentifier,
    base64Data,
    contentType,
    docRefUuid = randomUUID(),
    binaryUuid = randomUUID(),
    dateTime = new Date().toISOString(),
  }) {
    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          fullUrl: `DocumentReference/${docRefUuid}`,
          resource: {
            resourceType: 'DocumentReference',
            id: docRefUuid,
            masterIdentifier: {
              system: 'http://medizininformatik-initiative.de/sid/project-identifier',
              value: projectIdentifier,
            },
            status: 'current',
            docStatus: 'final',
            author: [
              {
                type: 'Organization',
                identifier: {
                  system: 'http://dsf.dev/sid/organization-identifier',
                  value: organizationIdentifier,
                },
              },
            ],
            date: dateTime,
            content: [
              {
                attachment: {
                  contentType: contentType,
                  url: `Binary/${binaryUuid}`,
                },
              },
            ],
          },
          request: {
            method: 'PUT',
            url: `DocumentReference/${docRefUuid}`,
          },
        },
        {
          fullUrl: `Binary/${binaryUuid}`,
          resource: {
            resourceType: 'Binary',
            id: binaryUuid,
            contentType: contentType,
            data: base64Data,
          },
          request: {
            method: 'PUT',
            url: `Binary/${binaryUuid}`,
          },
        },
      ],
    };

    try {
      const response = await this.apiClient.post('', bundle);
      console.log('Successfully prepared CDS for Decentralized Analysis (JSON).');
      return response.data;
    } catch (error) {
      console.error('Error preparing CDS (JSON):', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 3. Starts the data-sharing coordinate process (JSON).
   *
   * @param {object} params - Parameters for the Task.
   * // ... (all other params are the same as the XML version)
   * @returns {Promise<object>} The created Task resource.
   */
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

  /**
   * 3. Starts the data-sharing coordinate process (JSON).
   *
   * @param {object} params - Parameters for the Task.
   * // ... (all other params are the same as the XML version)
   * @returns {Promise<object>} The created Task resource.
   */
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
      headers: this.fhirClient.FHIR_XML_HEADERS,
    });

    return response.data;
  }

  /**
   * 4. Polls for 'TaskReceivedDataSet' Tasks.
   * Fetches Tasks with the specific profile, sorted by last updated.
   *
   * @param {object} axiosInstance - Your pre-configured Axios instance for the HRP DSF.
   * @param {string} dsfFhirBaseUrl - The base URL of the HRP DSF FHIR server.
   * @returns {Promise<object>} The FHIR Bundle of matching Task resources.
   */
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
