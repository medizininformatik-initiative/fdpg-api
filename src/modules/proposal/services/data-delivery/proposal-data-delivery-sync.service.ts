import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryInfo } from '../../schema/sub-schema/data-delivery/delivery-info.schema';
import { DeliveryInfoStatus } from '../../enums/delivery-info-status.enum';
import { LocationService } from 'src/modules/location/service/location.service';
import { FhirService } from 'src/modules/fhir/fhir.service';
import { SubDeliveryStatus } from '../../enums/data-delivery.enum';

@Injectable()
export class ProposalDataDeliverySyncService {
  constructor(
    private readonly locationService: LocationService,
    private readonly fhirService: FhirService,
  ) {}

  private readonly logger = new Logger(ProposalDataDeliverySyncService.name);

  syncSubDeliveryStatusesWithDsf = async (proposalId: string, deliveryInfo: DeliveryInfo): Promise<void> => {
    if (![DeliveryInfoStatus.PENDING, DeliveryInfoStatus.WAITING_FOR_DATA_SET].includes(deliveryInfo.status)) {
      const message = `DeliveryInfo ${deliveryInfo._id} of proposal ${proposalId} is not in a '${DeliveryInfoStatus.PENDING}' state`;
      this.logger.error(message);
      throw Error(message);
    }

    if (!deliveryInfo.fhirBusinessKey) {
      const message = `DeliveryInfo ${deliveryInfo._id} of proposal ${proposalId} does not have a business key`;
      this.logger.error(message);
      throw new NotFoundException(message);
    }

    const locationLookUpMap = await this.locationService.findAllLookUpMap();

    const updatedFhirDeliveries = (
      await this.fhirService.pollForReceivedDataSetsByBusinessKey(
        deliveryInfo.fhirBusinessKey,
        deliveryInfo.lastSynced ?? deliveryInfo.createdAt,
      )
    ).map((fhirResponse) => fhirResponse['dic-identifier-value']);

    (deliveryInfo.subDeliveries || []).forEach((subDel) => {
      if (
        updatedFhirDeliveries.includes(locationLookUpMap[subDel.location]?.uri) &&
        subDel.status !== SubDeliveryStatus.ACCEPTED
      ) {
        subDel.status = SubDeliveryStatus.DELIVERED;
      }
    });

    deliveryInfo.lastSynced = new Date();
  };

  syncDeliveryInfoResultWithDsf = async (proposalId: string, deliveryInfo: DeliveryInfo): Promise<void> => {
    if (deliveryInfo.status !== DeliveryInfoStatus.WAITING_FOR_DATA_SET) {
      const message = `DeliveryInfo ${deliveryInfo._id} of proposal ${proposalId} is not in a '${DeliveryInfoStatus.WAITING_FOR_DATA_SET}' state`;
      this.logger.error(message);
      throw Error(message);
    }

    if (!deliveryInfo.fhirBusinessKey) {
      const message = `DeliveryInfo ${deliveryInfo._id} of proposal ${proposalId} does not have a business key`;
      this.logger.error(message);
      throw new NotFoundException(message);
    }

    if (!deliveryInfo.fhirTaskId) {
      const message = `DeliveryInfo ${deliveryInfo._id} of proposal ${proposalId} does not have a task id`;
      this.logger.error(message);
      throw new NotFoundException(message);
    }

    const resultUrl = await this.fhirService.fetchResultUrl(deliveryInfo.fhirTaskId);
    if (resultUrl) {
      this.logger.log(
        `Found result url for deliveryInfo '${deliveryInfo._id}' of proposal '${proposalId}'. Setting status to ${DeliveryInfoStatus.RESULTS_AVAILABLE}`,
      );
      deliveryInfo.status = DeliveryInfoStatus.RESULTS_AVAILABLE;
      deliveryInfo.resultUrl = resultUrl;
    } else {
      this.logger.log(`No results found for '${deliveryInfo._id}' of proposal '${proposalId}'`);
    }

    deliveryInfo.lastSynced = new Date();
  };
}
