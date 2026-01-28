import { Test, TestingModule } from '@nestjs/testing';
import { ProposalDeliveryInfoService } from '../proposal-delivery-info.service';
import { FhirService } from 'src/modules/fhir/fhir.service';
import { ProposalDataDeliveryCrudService } from '../proposal-data-delivery-crud.service';
import { ProposalDataDeliveryMappingService } from '../proposal-data-delivery-mapping.service';
import { LocationService } from 'src/modules/location/service/location.service';
import { NotFoundException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { DeliveryInfoStatus } from '../../../enums/delivery-info-status.enum';
import { SubDeliveryStatus } from '../../../enums/data-delivery.enum';

describe('ProposalDeliveryInfoService', () => {
  let service: ProposalDeliveryInfoService;
  let fhirService: FhirService;
  let crudService: ProposalDataDeliveryCrudService;
  let mappingService: ProposalDataDeliveryMappingService;
  let locationService: LocationService;

  // Mock Data
  const mockUser = { userId: 'u1', singleKnownRole: Role.FdpgMember } as any;
  const mockDmsLocation = { _id: 'dms-1', uri: 'http://dms', dataManagementCenter: true };
  const mockDicLocation = { _id: 'dic-1', uri: 'http://dic', dataIntegrationCenter: true };
  const mockNonDicLocation = { _id: 'other-1', uri: 'http://other', dataIntegrationCenter: false };

  const mockProposal = {
    _id: 'prop-1',
    projectAbbreviation: 'PROJ',
    dataDelivery: { dataManagementSite: 'dms-1' },
    applicant: { researcher: { email: 'res@test.com' } },
    participants: [],
  } as any;

  const mockLookUpMap = {
    'dms-1': mockDmsLocation,
    'dic-1': mockDicLocation,
    'other-1': mockNonDicLocation,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalDeliveryInfoService,
        {
          provide: FhirService,
          useValue: {
            createCoordinateDataSharingTask: jest.fn(),
            releaseQuestionnairResponseReleaseConsolidateDataSets: jest.fn(),
            extendQuestionnairResponseReleaseConsolidateDataSets: jest.fn(),
          },
        },
        {
          provide: ProposalDataDeliveryCrudService,
          useValue: {
            createDeliveryInfo: jest.fn(),
          },
        },
        {
          provide: ProposalDataDeliveryMappingService,
          useValue: {
            mapToDeliveryInfoModel: jest.fn(),
          },
        },
        {
          provide: LocationService,
          useValue: {
            findAllLookUpMap: jest.fn().mockResolvedValue(mockLookUpMap),
          },
        },
      ],
    }).compile();

    service = module.get<ProposalDeliveryInfoService>(ProposalDeliveryInfoService);
    fhirService = module.get<FhirService>(FhirService);
    crudService = module.get<ProposalDataDeliveryCrudService>(ProposalDataDeliveryCrudService);
    mappingService = module.get<ProposalDataDeliveryMappingService>(ProposalDataDeliveryMappingService);
    locationService = module.get<LocationService>(LocationService);

    jest.clearAllMocks();
  });

  describe('initDeliveryInfo', () => {
    const baseDto = {
      _id: 'd1',
      name: 'Test Delivery',
      deliveryDate: new Date(),
      subDeliveries: [{ location: 'dic-1' }],
      manualEntry: false,
    } as any;

    beforeEach(() => {
      // Default mapping behavior: returns the DTO as a model
      (mappingService.mapToDeliveryInfoModel as jest.Mock).mockReturnValue([
        { ...baseDto, subDeliveries: [{ location: 'dic-1', status: 'PENDING' }] },
      ]);
    });

    it('should throw NotFoundException if location URI is missing', async () => {
      const badMap = { 'dms-1': mockDmsLocation, 'dic-1': {} }; // Empty location object (no URI)
      (locationService.findAllLookUpMap as jest.Mock).mockResolvedValue(badMap);

      await expect(service.initDeliveryInfo(mockProposal, baseDto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if DMS is not a dataManagementCenter', async () => {
      const badDms = { ...mockDmsLocation, dataManagementCenter: false };
      const badMap = { 'dms-1': badDms, 'dic-1': mockDicLocation };
      (locationService.findAllLookUpMap as jest.Mock).mockResolvedValue(badMap);

      await expect(service.initDeliveryInfo(mockProposal, baseDto, mockUser)).rejects.toThrow('is not a DMS');
    });

    it('should throw ForbiddenException if subDelivery location is not a DIC', async () => {
      // Using 'other-1' which is not a DIC
      const nonDicDto = { ...baseDto, subDeliveries: [{ location: 'other-1' }] };
      (mappingService.mapToDeliveryInfoModel as jest.Mock).mockReturnValue([
        { ...nonDicDto, subDeliveries: [{ location: 'other-1' }] },
      ]);

      await expect(service.initDeliveryInfo(mockProposal, nonDicDto, mockUser)).rejects.toThrow(
        "aren't data integration centers",
      );
    });

    describe('Manual Entry', () => {
      const manualDto = { ...baseDto, manualEntry: true };

      it('should succeed for FDPG Member', async () => {
        const fdpgUser = { ...mockUser, singleKnownRole: Role.FdpgMember };
        (crudService.createDeliveryInfo as jest.Mock).mockResolvedValue({});

        await service.initDeliveryInfo(mockProposal, manualDto, fdpgUser);
        expect(crudService.createDeliveryInfo).toHaveBeenCalled();
      });

      it('should succeed for DMO', async () => {
        const dmoUser = { ...mockUser, singleKnownRole: Role.DataManagementOffice };
        (crudService.createDeliveryInfo as jest.Mock).mockResolvedValue({});

        await service.initDeliveryInfo(mockProposal, manualDto, dmoUser);
        expect(crudService.createDeliveryInfo).toHaveBeenCalled();
      });

      it('should fail for Researcher', async () => {
        const researcher = { ...mockUser, singleKnownRole: Role.Researcher };
        await expect(service.initDeliveryInfo(mockProposal, manualDto, researcher)).rejects.toThrow(
          'Role cannot create manual entry',
        );
      });
    });

    describe('DSF (Automated) Entry', () => {
      const dsfDto = { ...baseDto, manualEntry: false };

      it('should succeed for FDPG Member and call FHIR service', async () => {
        const fhirResponse = { fhirTaskId: 'T1', fhirBusinessKey: 'K1' };
        (fhirService.createCoordinateDataSharingTask as jest.Mock).mockResolvedValue(fhirResponse);
        (crudService.createDeliveryInfo as jest.Mock).mockResolvedValue({});

        await service.initDeliveryInfo(mockProposal, dsfDto, mockUser);

        expect(fhirService.createCoordinateDataSharingTask).toHaveBeenCalledWith(
          mockProposal._id,
          dsfDto.name,
          mockDmsLocation,
          [mockDicLocation], // Array of looked-up location objects
          ['res@test.com'], // Researcher emails
          dsfDto.deliveryDate,
        );

        expect(crudService.createDeliveryInfo).toHaveBeenCalledWith(
          mockProposal._id,
          expect.objectContaining({
            fhirTaskId: 'T1',
            fhirBusinessKey: 'K1',
            manualEntry: false,
          }),
        );
      });

      it('should fail for DMO', async () => {
        const dmoUser = { ...mockUser, singleKnownRole: Role.DataManagementOffice };
        await expect(service.initDeliveryInfo(mockProposal, dsfDto, dmoUser)).rejects.toThrow(
          'Role cannot create DSF entry',
        );
      });
    });
  });

  describe('setToForwardDelivery', () => {
    it('should set status to WAITING_FOR_DATA_SET, cancel pending subDeliveries and call FHIR release', async () => {
      const deliveryInfo = {
        fhirBusinessKey: 'BK-123',
        subDeliveries: [{ status: SubDeliveryStatus.PENDING }],
      } as any;

      await service.setToForwardDelivery(deliveryInfo);

      expect(deliveryInfo.status).toBe(DeliveryInfoStatus.WAITING_FOR_DATA_SET);
      expect(deliveryInfo.forwardedOnDate).toBeDefined();

      expect(deliveryInfo.subDeliveries[0].status).toBe(SubDeliveryStatus.CANCELED);

      expect(fhirService.releaseQuestionnairResponseReleaseConsolidateDataSets).toHaveBeenCalledWith('BK-123');
    });

    it('should preserve ACCEPTED subDeliveries', async () => {
      const deliveryInfo = {
        subDeliveries: [{ status: SubDeliveryStatus.ACCEPTED }],
      } as any;

      (fhirService.releaseQuestionnairResponseReleaseConsolidateDataSets as jest.Mock).mockResolvedValue(undefined);

      await service.setToForwardDelivery(deliveryInfo);

      expect(deliveryInfo.subDeliveries[0].status).toBe(SubDeliveryStatus.ACCEPTED);
    });
  });

  describe('setToCancelDelivery', () => {
    it('should set status to CANCELED and update subDeliveries', () => {
      const deliveryInfo = {
        subDeliveries: [{ status: SubDeliveryStatus.PENDING }],
      } as any;

      service.setToCancelDelivery(deliveryInfo);

      expect(deliveryInfo.status).toBe(DeliveryInfoStatus.CANCELED);
      expect(deliveryInfo.forwardedOnDate).toBeDefined();
      expect(deliveryInfo.subDeliveries[0].status).toBe(SubDeliveryStatus.CANCELED);
    });
  });

  describe('setStatusToFetched', () => {
    it('should set status and timestamp', () => {
      const deliveryInfo = {} as any;
      service.setStatusToFetched(deliveryInfo);

      expect(deliveryInfo.status).toBe(DeliveryInfoStatus.FETCHED_BY_RESEARCHER);
      expect(deliveryInfo.fetchedResultsOn).toBeInstanceOf(Date);
    });
  });

  describe('extendDeliveryInfo', () => {
    it('should update date and call FHIR service', async () => {
      const deliveryInfo = { fhirBusinessKey: 'BK-1' } as any;
      const newDate = new Date('2025-01-01');

      await service.extendDeliveryInfo(deliveryInfo, newDate);

      expect(deliveryInfo.deliveryDate.toISOString()).toBe(newDate.toISOString());
      expect(fhirService.extendQuestionnairResponseReleaseConsolidateDataSets).toHaveBeenCalledWith(
        'BK-1',
        expect.any(Date),
      );
    });
  });
});
