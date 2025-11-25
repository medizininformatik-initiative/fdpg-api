import { Injectable } from '@nestjs/common';
import { FHIR_SYSTEM_CONSTANTS } from '../constants/fhir-constants';

@Injectable()
export class FhirTaskCoordinateSharingPayloadFactory {
  /**
   * Creates the payload for starting a data sharing process.
   *
   * @param businessKey - Identifier that bundles all ressources
   * @param hrpOrganizationIdentifier - health portal identifier. Default 'forschen-fuer-gesundheit.de'
   * @param projectIdentifier - The project identifier
   * @param contractUrl - the contract url
   * @param dmsIdentifier - the uri of the DMS
   * @param researcherIdentifiers - researcher identifiers
   * @param dicIdentifiers - the uri of the requested dic
   * @param extractionPeriod - maximum extraction period the DIC sites have time to deliver the results to the DMS. Given in ISO8601 duration format (DSF defaults to 'P28D' => 28 Days)
   * @param dateTime - Timestamp when the ressource is created. Is optional and defaults to the current timestamp
   */
  createStartProcessPayload({
    businessKey,
    hrpOrganizationIdentifier = 'forschen-fuer-gesundheit.de',
    projectIdentifier,
    contractUrl,
    dmsIdentifier,
    researcherIdentifiers = [],
    dicIdentifiers = [],
    extractionPeriod = 'P28D',
    dateTime = new Date().toISOString(),
  }) {
    return {
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
                code: FHIR_SYSTEM_CONSTANTS['business-key'].targetKey,
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
  }
}
