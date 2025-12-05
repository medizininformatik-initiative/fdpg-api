import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { FhirClient } from '../fhir.client';
import { FhirHelpersUtil } from '../util/fhir-helpers.util';
import { findConsolidateDataSetsEntryByBusinessKey } from './dsf-questionnaire-response.util';
import { QuestionnaireResponseItem, QuestionnaireResponseResource } from './dsf-questionnaire-response.type';

@Injectable()
export class DsfQuestionnaireResponseService {
  constructor(private readonly fhirClient: FhirClient) {
    this.apiClient = this.fhirClient.client;
  }

  private apiClient: AxiosInstance;
  private readonly logger = new Logger(DsfQuestionnaireResponseService.name);
  private readonly MAX_PAGINATION_REQUEST_COUNT = 10;

  async getQuetionnairResponseReleaseConsolidateDataSets(
    businessKey: string,
  ): Promise<QuestionnaireResponseResource | undefined> {
    if (!businessKey) {
      const msg = 'Business key not provided. Cannot search for QuestionnaireResponse.';
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.logger.log(`Starting search for QuestionnaireResponse with businessKey: '${businessKey}'...`);

    const initialParams = {
      _sort: '-_lastUpdated',
      status: 'in-progress',
    };

    let requestCount = 0;

    try {
      const paginator = FhirHelpersUtil.paginateFhirTaskGenerator(
        this.apiClient,
        initialParams,
        '/QuestionnaireResponse',
      );

      for await (const rawEntries of paginator) {
        requestCount++;

        this.logger.verbose(`Scanning page ${requestCount} for businessKey '${businessKey}'...`);

        if (!rawEntries || rawEntries.length === 0) {
          continue;
        }

        const match = findConsolidateDataSetsEntryByBusinessKey(rawEntries, businessKey);

        if (match) {
          this.logger.log(
            `Success: Found QuestionnaireResponse (ID: ${match.id}) for businessKey '${businessKey}' on page ${requestCount}.`,
          );
          return match;
        }

        if (requestCount >= this.MAX_PAGINATION_REQUEST_COUNT) {
          this.logger.warn(
            `Pagination Limit Reached: Scanned ${requestCount} pages without finding businessKey '${businessKey}'. Stopping search.`,
          );
          return undefined;
        }
      }

      this.logger.log(`Completed search of all available pages. No match found for businessKey '${businessKey}'.`);
      return undefined;
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;

      this.logger.error(
        `Error while polling QuestionnaireResponse for businessKey '${businessKey}': ${errorMsg}`,
        error.stack,
      );
      throw error;
    }
  }

  private getExtendReleaseConsolidateDataSetsAnswer(extendPeriod: string = 'P1D'): QuestionnaireResponseItem[] {
    return [
      {
        linkId: 'release',
        text: 'Should consolidation of data-sets start?',
        answer: [
          {
            valueBoolean: false,
          },
        ],
      },
      {
        linkId: 'extended-extraction-period',
        text: 'If consolidation should not start, please set a new extraction period following the ISO 8601 time duration pattern.',
        answer: [
          {
            valueString: extendPeriod,
          },
        ],
      },
    ];
  }

  private getAcceptReleaseConsolidateDataSetsAnswer(): QuestionnaireResponseItem[] {
    return [
      {
        linkId: 'release',
        text: 'Should consolidation of data-sets start?',
        answer: [
          {
            valueBoolean: true,
          },
        ],
      },
    ];
  }

  private getAnswer(extend: boolean, extendPeriod?: string): QuestionnaireResponseItem[] {
    if (extend) {
      return this.getExtendReleaseConsolidateDataSetsAnswer(extendPeriod);
    } else {
      return this.getAcceptReleaseConsolidateDataSetsAnswer();
    }
  }

  async setReleaseConsolidateDataSetsAnswer(
    businessKey: string,
    extend: boolean,
    extendPeriod?: string,
  ): Promise<void> {
    this.logger.log(
      `Attempting to set release/consolidate answer for businessKey: '${businessKey}' (Extend: ${extend})`,
    );

    const questionnaireResponse = await this.getQuetionnairResponseReleaseConsolidateDataSets(businessKey);

    if (!questionnaireResponse) {
      const errorMsg = `Could not find any 'in-progress' QuestionnaireResponse for businessKey '${businessKey}'. Aborting update.`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.logger.verbose(`Found QuestionnaireResponse (ID: ${questionnaireResponse.id}). Preparing payload...`);

    const newItems = [
      ...questionnaireResponse.item.filter((it) => !['release', 'extended-extraction-period'].includes(it.linkId)),
      ...this.getAnswer(extend, extendPeriod),
    ];

    const payload: QuestionnaireResponseResource = {
      ...questionnaireResponse,
      status: 'completed',
      authored: new Date().toISOString(),
      item: newItems,
    };

    try {
      this.logger.verbose(`Sending PUT request to /QuestionnaireResponse/${questionnaireResponse.id}`);

      await this.apiClient.put(`/QuestionnaireResponse/${questionnaireResponse.id}`, payload);

      this.logger.log(
        `Successfully updated QuestionnaireResponse (ID: ${questionnaireResponse.id}) status to 'completed' for businessKey '${businessKey}'.`,
      );
    } catch (error) {
      const apiErrorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;

      this.logger.error(
        `Failed to update QuestionnaireResponse (ID: ${questionnaireResponse.id}): ${apiErrorMsg}`,
        error.stack,
      );
      throw error;
    }
  }
}
