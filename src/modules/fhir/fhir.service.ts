import { Injectable, Logger } from '@nestjs/common';
import { FhirReceivedDataSetType } from './type/fhir-received-dataset.type';
import { v4 as uuidV4 } from 'uuid';
import { FhirHelpersUtil } from './util/fhir-helpers.util';
import { ConfigService } from '@nestjs/config';
import { DsfQuestionnaireResponseService } from './dsf-questionnaire-response/dsf-questionnaire-response.service';
import { DsfTaskService } from './dsf-task/dsf-task.service';
import { Location } from '../location/schema/location.schema';

@Injectable()
export class FhirService {
  constructor(
    private readonly configService: ConfigService,
    private readonly questionnaireResponseService: DsfQuestionnaireResponseService,
    private readonly taskService: DsfTaskService,
  ) {
    this.FRONTEND_URL = this.configService.get('FRONTEND_URL');
    this.IS_FHIR_TEST = this.configService.get('IS_FHIR_TEST', 'false') === 'true';

    if (this.IS_FHIR_TEST) {
      this.logger.warn('FHIR TESTING IS ENABLED');
    }
  }

  private readonly logger = new Logger(FhirService.name);
  private FRONTEND_URL: string;
  private IS_FHIR_TEST = false;

  async createCoordinateDataSharingTask(
    proposalId: string,
    deliveryName: string,
    dms: Location,
    dicLocations: Location[],
    researcherMails: string[],
    deliveryDate: Date,
  ): Promise<{ fhirBusinessKey: string; fhirTaskId: string }> {
    const businessKey = uuidV4();

    const extractionPeriod = FhirHelpersUtil.getExtractionPeriod(new Date(), new Date(deliveryDate));

    const startParams = {
      hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
      projectIdentifier: deliveryName,
      contractUrl: `${this.FRONTEND_URL}/proposals/${proposalId}/details`,
      dmsIdentifier: dms.uri,
      researcherIdentifiers: researcherMails,
      dicIdentifiers: dicLocations.map((dic) => dic.uri),
      extractionPeriod,
      businessKey,
    };

    if (this.IS_FHIR_TEST) {
      this.logger.warn('FHIR TESTING ARGUMENTS ARE ENABLED. The client will not use actual DMS and DIC identifiers.');

      startParams.dmsIdentifier = 'dms.test.forschen-fuer-gesundheit.de';
      this.logger.warn(`OVERRIDDEN DMS IDENTIFIER '${startParams.dmsIdentifier}'`);

      startParams.dicIdentifiers = ['diz-1.test.fdpg.forschen-fuer-gesundheit.de'];
      this.logger.warn(`OVERRIDDEN DIC IDENTIFIER '${startParams.dicIdentifiers}'`);

      startParams.projectIdentifier = 'Test_PROJECT_NDJSON_TXT';
      this.logger.warn(`OVERRIDDEN PROJECT IDENTIFIER IDENTIFIER '${startParams.projectIdentifier}'`);
    }

    const createdTask = await this.taskService.startCoordinateDataSharingProcess(startParams);

    return { fhirBusinessKey: businessKey, fhirTaskId: createdTask.id };
  }

  async pollForReceivedDataSetsByBusinessKey(businessKey: string, lastSync: Date): Promise<FhirReceivedDataSetType[]> {
    return await this.taskService.pollForReceivedDataSetsByBusinessKey(businessKey, lastSync);
  }

  async extendQuestionnairResponseReleaseConsolidateDataSets(
    businessKey: string,
    newDeliveryDate: Date,
  ): Promise<void> {
    const extractionPeriod = FhirHelpersUtil.getExtractionPeriod(new Date(), new Date(newDeliveryDate));
    await this.questionnaireResponseService.setReleaseConsolidateDataSetsAnswer(businessKey, true, extractionPeriod);
  }

  // Creates Questionnair for DMS to release-merged-data-set and is done by HRP
  async releaseQuestionnairResponseReleaseConsolidateDataSets(businessKey: string): Promise<void> {
    await this.questionnaireResponseService.setReleaseConsolidateDataSetsAnswer(businessKey, false);
  }

  async fetchResultUrl(fhirTaskId: string): Promise<string | null> {
    const resultUrl = await this.taskService.getResultUrlByTaskId(fhirTaskId);

    if (!resultUrl || resultUrl.trim() === '') {
      return null;
    }

    return resultUrl;
  }
}
