import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryInfo } from '../../schema/sub-schema/data-delivery/delivery-info.schema';
import { Proposal } from '../../schema/proposal.schema';
import { FhirService } from 'src/modules/fhir/fhir.service';
import { DeliveryInfoUpdateDto } from '../../dto/proposal/data-delivery/delivery-info.dto';
import { ProposalDataDeliveryCrudService } from './proposal-data-delivery-crud.service';
import { ProposalDataDeliveryMappingService } from './proposal-data-delivery-mapping.service';
import { LocationService } from 'src/modules/location/service/location.service';
import { DataDelivery } from '../../schema/sub-schema/data-delivery/data-delivery.schema';
import { DeliveryInfoStatus } from '../../enums/delivery-info-status.enum';
import { SubDeliveryStatus } from '../../enums/data-delivery.enum';

@Injectable()
export class ProposalDeliveryInfoService {
  constructor(
    private readonly fhirService: FhirService,
    private readonly proposalDataDeliveryCrudService: ProposalDataDeliveryCrudService,
    private readonly proposalDataDeliveryMappingService: ProposalDataDeliveryMappingService,
    private readonly locationService: LocationService,
  ) {}

  private readonly logger = new Logger(ProposalDeliveryInfoService.name);

  initDeliveryInfo = async (proposal: Proposal, dto: DeliveryInfoUpdateDto): Promise<DataDelivery> => {
    const locationMap = await this.locationService.findAllLookUpMap();
    const selectedDms = locationMap[proposal.dataDelivery.dataManagementSite];

    const newDeliveryModel = {
      ...this.proposalDataDeliveryMappingService.mapToDeliveryInfoModel([dto])[0],
      lastSynced: undefined,
      dms: selectedDms._id,
    } as DeliveryInfo;

    const dicLocations = newDeliveryModel.subDeliveries.map((delivery) => {
      const location = locationMap[delivery.location];

      if (!location || !location.uri) {
        throw new NotFoundException(`Location or URI not found for subDelivery location ID: ${delivery.location}`);
      }

      return location;
    });

    if (!selectedDms.dataManagementCenter) {
      throw new ForbiddenException(`Location '${selectedDms._id}' is not a DMS`);
    }

    const notDicLocations = dicLocations.filter((loc) => !loc.dataIntegrationCenter);

    if (notDicLocations.length > 0) {
      throw new ForbiddenException(`Locations ${notDicLocations} aren't data integration centers`);
    }

    const toBeSaved = await (async (): Promise<DeliveryInfo> => {
      if (dto.manualEntry) {
        return {
          ...newDeliveryModel,
          status: DeliveryInfoStatus.FINISHED,
          forwardedOnDate: new Date(),
          subDeliveries: newDeliveryModel.subDeliveries.map((sd) => ({ ...sd, status: SubDeliveryStatus.ACCEPTED })),
        };
      } else {
        const researcherEmails = [
          proposal.applicant?.researcher?.email ?? 'applicant_mail_not_found@invalid.com',
          ...(proposal.participants || []).map((p) => p.researcher.email),
        ];

        const { fhirTaskId, fhirBusinessKey } = await this.fhirService.createCoordinateDataSharingTask(
          proposal._id,
          proposal.projectAbbreviation,
          selectedDms,
          dicLocations,
          researcherEmails,
          dto.deliveryDate,
        );

        return { ...newDeliveryModel, fhirTaskId, fhirBusinessKey };
      }
    })();

    return await this.proposalDataDeliveryCrudService.createDeliveryInfo(proposal._id, toBeSaved);
  };

  setToForwardDelivery = (deliveryInfo: DeliveryInfo) =>
    this.setStatus(deliveryInfo, DeliveryInfoStatus.WAITING_FOR_DATA_SET);

  setToCancelDelivery = (deliveryInfo: DeliveryInfo) => this.setStatus(deliveryInfo, DeliveryInfoStatus.CANCELED);

  private setStatus = (deliveryInfo: DeliveryInfo, status: DeliveryInfoStatus) => {
    deliveryInfo.status = status;
    deliveryInfo.forwardedOnDate = new Date();
    deliveryInfo.subDeliveries = (deliveryInfo.subDeliveries || []).map((sd) => {
      return {
        ...sd,
        status: sd.status === SubDeliveryStatus.ACCEPTED ? SubDeliveryStatus.ACCEPTED : SubDeliveryStatus.CANCELED,
      };
    });
  };
}
