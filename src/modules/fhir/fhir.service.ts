import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryInfo } from '../proposal/schema/sub-schema/data-delivery/delivery-info.schema';
import { Proposal } from '../proposal/schema/proposal.schema';
import { LocationService } from '../location/service/location.service';
import { FhirReceivedDataSetType } from './type/fhir-received-dataset.type';
import { v4 as uuidV4 } from 'uuid';
import { FhirHelpersUtil } from './util/fhir-helpers.util';
import { ConfigService } from '@nestjs/config';
import { DsfQuestionnaireResponseService } from './dsf-questionnaire-response/dsf-questionnaire-response.service';
import { DsfTaskService } from './dsf-task/dsf-task.service';
import { DeliveryInfoStatus } from '../proposal/enums/delivery-info-status.enum';

@Injectable()
export class FhirService {
  constructor(
    private readonly locationService: LocationService,
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
      throw new ForbiddenException(`Location '${dms._id}' is not a DMS`);
    }

    const notDicLocations = dicLocations.filter((loc) => !loc.dataIntegrationCenter);

    if (notDicLocations.length > 0) {
      throw new ForbiddenException(`Locations ${notDicLocations} aren't data integration centers`);
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

    deliveryInfo.fhirTaskId = createdTask.id;
    deliveryInfo.fhirBusinessKey = businessKey;
    deliveryInfo.dms = dms._id;

    return deliveryInfo;
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

  async fetchResultUrl(deliveryInfo: DeliveryInfo): Promise<DeliveryInfo> {
    if (!deliveryInfo.fhirTaskId) {
      const msg = `DeliveryInfo with Id '${deliveryInfo._id}' does not have a task Id!`;
      this.logger.error(msg);
      throw Error(msg);
    }

    const resultUrl = await this.taskService.getResultUrlByTaskId(deliveryInfo.fhirTaskId);

    if (!resultUrl) {
      this.logger.warn(`No result URL for delivery info '${deliveryInfo._id}' found`);
      return deliveryInfo;
    }

    deliveryInfo.resultUrl = resultUrl;

    return deliveryInfo;
  }
}
