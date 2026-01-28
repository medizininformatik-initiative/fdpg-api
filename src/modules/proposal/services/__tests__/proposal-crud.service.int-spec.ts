import { describeWithMongo, MongoTestContext } from 'src/test/mongo-test.helper';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Location, LocationSchema } from 'src/modules/location/schema/location.schema';
import { Proposal, getProposalSchemaFactory } from '../../schema/proposal.schema';
import { KeycloakClient } from 'src/modules/user/keycloak.client';
import { FeasibilityAuthenticationClient } from 'src/modules/feasibility/feasibility-authentication.client';
import { StorageService } from 'src/modules/storage/storage.service';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { FhirAuthenticationClient } from 'src/modules/fhir/fhir-authentication.client';
import { LocationService } from 'src/modules/location/service/location.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { SharedService } from 'src/shared/shared.service';
import { StatusChangeService } from '../status-change.service';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';
import { ProposalSyncService } from '../proposal-sync.service';
import { MongooseModule } from '@nestjs/mongoose';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { CacheModule } from '@nestjs/cache-manager';

// Mock services
const mockEventEngineService = {
  handleProposalStatusChange: jest.fn().mockResolvedValue(undefined),
};

const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue('upload-id'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

const mockStatusChangeService = {
  handleEffects: jest.fn().mockResolvedValue(undefined),
};

const mockProposalFormService = {
  getCurrentVersion: jest.fn().mockResolvedValue(1),
};

const mockProposalSyncService = {
  syncProposal: jest.fn().mockResolvedValue(undefined),
};

const mockSharedService = {
  deleteProposalWithDependencies: jest.fn().mockImplementation(async (proposal) => {
    // Actually delete the proposal to make tests work
    await proposal.deleteOne();
  }),
};

describeWithMongo(
  'ProposalCrudServiceIT',
  [
    // Register both schemas together in one async module to ensure proper dependency resolution
    MongooseModule.forFeatureAsync([
      {
        name: Location.name,
        useFactory: () => LocationSchema,
      },
      {
        name: Proposal.name,
        useFactory: getProposalSchemaFactory,
        inject: [getModelToken(Location.name)],
      },
    ]),
    CacheModule.register(),
    ProposalCrudService,
    LocationService,
    { provide: SharedService, useValue: mockSharedService },
    { provide: EventEngineService, useValue: mockEventEngineService },
    { provide: StatusChangeService, useValue: mockStatusChangeService },
    { provide: ProposalFormService, useValue: mockProposalFormService },
    { provide: ProposalSyncService, useValue: mockProposalSyncService },
    { provide: FeasibilityAuthenticationClient, useValue: { obtainToken: jest.fn() } },
    { provide: FhirAuthenticationClient, useValue: { obtainToken: jest.fn() } },
    { provide: KeycloakClient, useValue: { obtainToken: jest.fn() } },
    { provide: StorageService, useValue: mockStorageService },
  ],
  (getContext) => {
    let context: MongoTestContext;
    let locationService: LocationService;
    let locationModel: Model<Location>;
    let proposalCrudService: ProposalCrudService;
    let proposalModel: Model<Proposal>;

    const mockUser: IRequestUser = {
      userId: '51b933c7-d3d9-4617-9400-45a44b387326',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      username: 'testuser',
      fullName: 'Test User',
      roles: [Role.Researcher],
      miiLocation: 'UKL',
      singleKnownRole: Role.Researcher,
    } as IRequestUser;

    beforeEach(async () => {
      context = getContext();

      locationService = context.app.get<LocationService>(LocationService);
      locationModel = context.app.get<Model<Location>>(getModelToken(Location.name));

      proposalCrudService = context.app.get<ProposalCrudService>(ProposalCrudService);
      proposalModel = context.app.get<Model<Proposal>>(getModelToken(Proposal.name));

      // Clear all mocks
      jest.clearAllMocks();

      // Create a test location for all tests
      await locationModel.create({
        _id: 'UKL',
        externalCode: 'UKL',
        display: 'UKL',
        consortium: 'consortium',
        dataIntegrationCenter: false,
        dataManagementCenter: false,
        deprecated: false,
      });
    });

    it('should create and retrieve a proposal via service', async () => {
      const createDto = {
        projectAbbreviation: 'RETRIEVE-TEST',
        status: ProposalStatus.Draft,
        selectedDataSources: [PlatformIdentifier.Mii],
      };

      const created = await proposalCrudService.create(createDto as any, mockUser);
      const found = await proposalCrudService.findDocument(created._id.toString(), mockUser);

      expect(found).toBeDefined();
      expect(found.projectAbbreviation).toBe('RETRIEVE-TEST');
      expect(found.status).toBe(ProposalStatus.Draft);
    });

    it('should create a proposal via service', async () => {
      const createDto = {
        projectAbbreviation: 'TEST-001',
        status: ProposalStatus.Draft,
        selectedDataSources: [PlatformIdentifier.Mii],
      };

      const result = await proposalCrudService.create(createDto as any, mockUser);

      expect(result).toBeDefined();
      expect(result.projectAbbreviation).toBe('TEST-001');
      expect(mockProposalFormService.getCurrentVersion).toHaveBeenCalled();
    });

    it('should find a proposal by ID via service', async () => {
      const createDto = {
        projectAbbreviation: 'FIND-TEST',
        status: ProposalStatus.Draft,
        selectedDataSources: [PlatformIdentifier.Mii],
      };

      const created = await proposalCrudService.create(createDto as any, mockUser);
      const found = await proposalCrudService.findDocument(created._id.toString(), mockUser);

      expect(found).toBeDefined();
      expect(found.projectAbbreviation).toBe('FIND-TEST');
    });

    it('should update a proposal via service', async () => {
      const createDto = {
        projectAbbreviation: 'UPDATE-TEST',
        status: ProposalStatus.Draft,
        selectedDataSources: [PlatformIdentifier.Mii],
      };

      const created = await proposalCrudService.create(createDto as any, mockUser);

      const updateDto = {
        _id: created._id.toString(),
        projectAbbreviation: 'UPDATED-TEST',
        status: created.status,
      };

      await proposalCrudService.update(created._id.toString(), updateDto as any, mockUser);

      const updated = await proposalCrudService.findDocument(created._id.toString(), mockUser);
      expect(updated.projectAbbreviation).toBe('UPDATED-TEST');
    });

    it('should delete a proposal via service', async () => {
      const createDto = {
        projectAbbreviation: 'DELETE-TEST',
        status: ProposalStatus.Draft,
        selectedDataSources: [PlatformIdentifier.Mii],
      };

      const created = await proposalCrudService.create(createDto as any, mockUser);

      await proposalCrudService.delete(created._id.toString(), mockUser);

      // Verify deletion by trying to find it
      await expect(proposalCrudService.findDocument(created._id.toString(), mockUser)).rejects.toThrow();
    });

    it('should create and retrieve multiple proposals via service', async () => {
      // Create multiple proposals via service
      const createdIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const createDto = {
          projectAbbreviation: `MULTI-${i}`,
          status: ProposalStatus.Draft,
          selectedDataSources: [PlatformIdentifier.Mii],
        };
        const created = await proposalCrudService.create(createDto as any, mockUser);
        createdIds.push(created._id.toString());
      }

      // Verify each proposal can be retrieved
      for (const id of createdIds) {
        const found = await proposalCrudService.findDocument(id, mockUser);
        expect(found).toBeDefined();
        expect(found._id.toString()).toBe(id);
      }

      expect(createdIds.length).toBe(3);
    });

    it('should create proposals with different statuses via service', async () => {
      const draftDto = {
        projectAbbreviation: 'STATUS-DRAFT',
        status: ProposalStatus.Draft,
        selectedDataSources: [PlatformIdentifier.Mii],
      };
      const draftProposal = await proposalCrudService.create(draftDto as any, mockUser);

      const checkDto = {
        projectAbbreviation: 'STATUS-CHECK',
        status: ProposalStatus.FdpgCheck,
        selectedDataSources: [PlatformIdentifier.Mii],
      };
      const checkProposal = await proposalCrudService.create(checkDto as any, mockUser);

      // Verify both proposals were created with correct statuses
      const foundDraft = await proposalCrudService.findDocument(draftProposal._id.toString(), mockUser);
      expect(foundDraft.status).toBe(ProposalStatus.Draft);

      const foundCheck = await proposalCrudService.findDocument(checkProposal._id.toString(), mockUser);
      expect(foundCheck.status).toBe(ProposalStatus.FdpgCheck);
    });

    it('should handle DIFE data source ID generation', async () => {
      const createDto = {
        projectAbbreviation: 'DIFE-001',
        status: ProposalStatus.Draft,
        selectedDataSources: [PlatformIdentifier.DIFE],
      };

      const result = await proposalCrudService.create(createDto as any, mockUser);

      expect(result).toBeDefined();
      // Should have generated a dataSourceLocaleId when DIFE is selected
      const created = await proposalModel.findOne({ projectAbbreviation: 'DIFE-001' });
      if (created?.selectedDataSources?.includes(PlatformIdentifier.DIFE)) {
        expect(created.dataSourceLocaleId).toBeDefined();
      }
    });
  },
);
