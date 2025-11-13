import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProposalSyncService } from '../proposal-sync.service';
import { AcptPluginClient } from '../../../app/acpt-plugin/acpt-plugin.client';
import { Proposal, ProposalDocument } from '../../schema/proposal.schema';
import { ProposalType } from '../../enums/proposal-type.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { SyncStatus } from '../../enums/sync-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';

describe('ProposalSyncService', () => {
  let service: ProposalSyncService;
  let proposalModel: Model<ProposalDocument>;
  let acptPluginClient: jest.Mocked<AcptPluginClient>;

  const mockFdpgUser: IRequestUser = {
    userId: 'fdpg-user',
    email: 'fdpg@test.com',
    firstName: 'FDPG',
    lastName: 'Member',
    fullName: 'FDPG Member',
    username: 'fdpg.member',
    roles: [Role.FdpgMember],
    email_verified: true,
    singleKnownRole: Role.FdpgMember,
    isFromLocation: false,
    isKnownLocation: false,
    isInactiveLocation: false,
    assignedDataSources: [],
  };

  const mockProposal: Partial<ProposalDocument> = {
    _id: 'proposal-123',
    projectAbbreviation: 'TEST-001',
    type: ProposalType.RegisteringForm,
    status: ProposalStatus.Published,
    registerInfo: {
      isInternalRegistration: false,
      syncStatus: SyncStatus.NotSynced,
      syncRetryCount: 0,
      legalBasis: true,
      diagnoses: ['D123'],
      procedures: ['P456'],
      isDone: true,
      _id: 'register-info-123',
    },
    projectResponsible: {
      researcher: {
        firstName: 'John',
        lastName: 'Doe',
        title: 'Dr.',
        affiliation: 'Test University',
        email: 'john.doe@test.com',
        isDone: true,
        _id: 'researcher-123',
      },
      institute: {
        miiLocation: 'Charité',
        name: '',
        streetAddress: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        email: '',
        isDone: true,
        _id: 'institute-123',
      },
      participantCategory: null,
      participantRole: null,
      projectResponsibility: null,
      addedByFdpg: false,
    },
    participants: [],
    userProject: {
      addressees: {
        desiredLocations: ['Charité', 'UKOWL'],
        isDone: true,
        _id: 'addressees-123',
      },
      generalProjectInformation: {
        projectTitle: 'Test Project',
        desiredStartTime: new Date('2025-01-01'),
        projectDuration: 12,
        projectFunding: 'EU Horizon 2020',
        fundingReferenceNumber: 'REF-12345',
        keywords: ['test', 'project'],
        desiredStartTimeType: 'now',
        isDone: true,
        _id: 'gen-info-123',
      },
      projectDetails: {
        simpleProjectDescription: '<p>Test description</p>',
        scientificBackground: '<p>Background</p>',
        hypothesisAndQuestionProjectGoals: '<p>Goals</p>',
        materialAndMethods: '<p>Methods</p>',
        department: [],
        literature: '',
        executiveSummaryUac: '',
        biometric: '',
        isDone: true,
        _id: 'project-details-123',
      },
      typeOfUse: {
        usage: ['DISTRIBUTED'],
        difeUsage: [],
        pseudonymizationInfo: [],
        pseudonymizationInfoTexts: {
          enableRecordLinkage: '',
          siteGroupingEnabled: '',
          namedSiteVariable: '',
        },
        isDone: true,
        _id: 'type-of-use-123',
      },
    },
    deadlines: {
      DUE_DAYS_FDPG_CHECK: null,
      DUE_DAYS_LOCATION_CHECK: new Date('2025-02-01'),
      DUE_DAYS_LOCATION_CONTRACTING: null,
      DUE_DAYS_EXPECT_DATA_DELIVERY: null,
      DUE_DAYS_DATA_CORRUPT: null,
      DUE_DAYS_FINISHED_PROJECT: new Date('2026-01-01'),
    },
  } as ProposalDocument;

  beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ProposalSyncService,
      {
        provide: getModelToken(Proposal.name),
        useValue: {
          findById: jest.fn(),
          find: jest.fn(),
        },
      },
      {
        provide: AcptPluginClient,
        useValue: {
          createProject: jest.fn(),
          updateProject: jest.fn(),
          findResearcherByName: jest.fn(),
          createResearcher: jest.fn(),
          findLocationByName: jest.fn(),
          createLocation: jest.fn(),
        },
      },
    ],
  }).compile();

    service = module.get<ProposalSyncService>(ProposalSyncService);
    proposalModel = module.get<Model<ProposalDocument>>(getModelToken(Proposal.name));
    acptPluginClient = module.get(AcptPluginClient);
  });

  describe('syncProposal', () => {
    it('should sync a proposal successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const mockProposalForUpdate = {
        ...mockProposal,
        _id: mockProposal._id,
        registerInfo: { ...mockProposal.registerInfo, syncStatus: SyncStatus.Syncing },
        save: mockSave,
      };

      // Mock initial findById and double-check findById
      (proposalModel.findById as jest.Mock)
        .mockResolvedValueOnce({ ...mockProposal, _id: mockProposal._id, save: jest.fn().mockResolvedValue(mockProposal) }) // First call in findAndValidate
        .mockResolvedValueOnce(mockProposalForUpdate) // Second call for double-check
        .mockResolvedValueOnce(mockProposalForUpdate); // Third call in updateSyncStatus

      // Mock researcher sync
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');

      // Mock location sync
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');

      // Mock project creation
      (acptPluginClient.createProject as jest.Mock).mockResolvedValue({ id: 'project-wp-id' });

      const result = await service.syncProposal('proposal-123', mockFdpgUser);

      expect(result.success).toBe(true);
      expect(result.proposalId).toBe('proposal-123');
      expect(result.projectAbbreviation).toBe('TEST-001');

      // Verify save was called (for updateSyncStatus and final update)
      expect(mockSave).toHaveBeenCalled();

      // Verify the proposal was updated with correct status
      expect(mockProposalForUpdate.registerInfo.syncStatus).toBe(SyncStatus.Synced);
      expect(mockProposalForUpdate.registerInfo.acptPluginId).toBe('project-wp-id');
    });

    it('should create new researcher if not found', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const mockProposalWithSave = { ...mockProposal, _id: mockProposal._id, save: mockSave };
      
      (proposalModel.findById as jest.Mock).mockResolvedValue(mockProposalWithSave);

      // Researcher not found
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue(null);
      (acptPluginClient.createResearcher as jest.Mock).mockResolvedValue({ id: 'new-researcher-id' });

      // Mock location sync
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');

      // Mock project creation
      (acptPluginClient.createProject as jest.Mock).mockResolvedValue({ id: 'project-wp-id' });

      await service.syncProposal('proposal-123', mockFdpgUser);

      expect(acptPluginClient.findResearcherByName).toHaveBeenCalledWith('John', 'Doe');
      expect(acptPluginClient.createResearcher).toHaveBeenCalledWith({
        title: 'Dr. John Doe',
        status: 'publish',
        content: '',
        acpt: {
          meta: [
            { box: 'fdpgx-researcher-fields', field: 'fdpgx-firstname', value: 'John' },
            { box: 'fdpgx-researcher-fields', field: 'fdpgx-lastname', value: 'Doe' },
            { box: 'fdpgx-researcher-fields', field: 'fdpgx-scientifictitle', value: 'Dr.' },
            { box: 'fdpgx-researcher-fields', field: 'fdpgx-affiliation', value: 'Test University' },
          ],
        },
      });
    });

    it('should create new location if not found', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const mockProposalWithSave = { ...mockProposal, _id: mockProposal._id, save: mockSave };
      
      (proposalModel.findById as jest.Mock).mockResolvedValue(mockProposalWithSave);

      // Mock researcher sync
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');

      // Location not found
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue(null);
      (acptPluginClient.createLocation as jest.Mock).mockResolvedValue({ id: 'new-location-id' });

      // Mock project creation
      (acptPluginClient.createProject as jest.Mock).mockResolvedValue({ id: 'project-wp-id' });

      await service.syncProposal('proposal-123', mockFdpgUser);

      expect(acptPluginClient.findLocationByName).toHaveBeenCalledWith('Charité');
      expect(acptPluginClient.createLocation).toHaveBeenCalledWith({
        title: 'Charité',
        status: 'publish',
        content: '',
        acpt: {
          meta: [{ box: 'location-fields', field: 'fdpgx-name', value: 'Charité' }],
        },
      });
    });

    it('should throw ForbiddenException if user is not FDPG member', async () => {
      const researcherUser: IRequestUser = {
        ...mockFdpgUser,
        roles: [Role.Researcher],
        singleKnownRole: Role.Researcher,
      };

      (proposalModel.findById as jest.Mock).mockResolvedValue(mockProposal);

      await expect(service.syncProposal('proposal-123', researcherUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if proposal not found', async () => {
      (proposalModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.syncProposal('non-existent', mockFdpgUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if proposal is not RegisteringForm', async () => {
      const applicationForm = {
        ...mockProposal,
        type: ProposalType.ApplicationForm,
      };
      (proposalModel.findById as jest.Mock).mockResolvedValue(applicationForm);

      await expect(service.syncProposal('proposal-123', mockFdpgUser)).rejects.toThrow(BadRequestException);
    });

    it('should handle sync failure and update status to SYNC_FAILED', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const mockProposalWithSave = { ...mockProposal, _id: mockProposal._id, save: mockSave };
      
      (proposalModel.findById as jest.Mock).mockResolvedValue(mockProposalWithSave);

      // Mock researcher sync
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');

      // Mock location sync
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');

      // Mock project creation failure
      (acptPluginClient.createProject as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await service.syncProposal('proposal-123', mockFdpgUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');

      // Verify failure was saved
      expect(mockSave).toHaveBeenCalled();
      expect(mockProposalWithSave.registerInfo.syncStatus).toBe(SyncStatus.SyncFailed);
      expect(mockProposalWithSave.registerInfo.lastSyncError).toContain('API Error');
    });

    it('should handle timeout errors specifically', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const mockProposalWithSave = { ...mockProposal, _id: mockProposal._id, save: mockSave };
      
      (proposalModel.findById as jest.Mock).mockResolvedValue(mockProposalWithSave);

      // Mock researcher sync
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');

      // Mock location sync
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');

      // Mock project creation timeout
      (acptPluginClient.createProject as jest.Mock).mockRejectedValue(new Error('timeout of 300000ms exceeded'));

      const result = await service.syncProposal('proposal-123', mockFdpgUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ACPT Plugin sync timed out');
      expect(result.error).toContain('WordPress server is slow or unreachable');

      // Verify failure was saved
      expect(mockSave).toHaveBeenCalled();
      expect(mockProposalWithSave.registerInfo.syncStatus).toBe(SyncStatus.SyncFailed);
      expect(mockProposalWithSave.registerInfo.lastSyncError).toContain('timed out');
    });

    it('should not set status to SYNCED if proposal was marked as SYNC_FAILED by another process', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const failedProposal = {
        ...mockProposal,
        _id: mockProposal._id,
        registerInfo: { ...mockProposal.registerInfo, syncStatus: SyncStatus.SyncFailed },
        save: mockSave,
      };

      // Initial findById returns proposal with NotSynced status
      (proposalModel.findById as jest.Mock)
        .mockResolvedValueOnce({ ...mockProposal, _id: mockProposal._id, save: jest.fn().mockResolvedValue(mockProposal) }) // First call in findAndValidate
        .mockResolvedValueOnce(failedProposal) // Second call shows it was marked as failed
        .mockResolvedValueOnce(failedProposal); // Third call in updateSyncStatus

      // Mock successful sync operations
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');
      (acptPluginClient.createProject as jest.Mock).mockResolvedValue({ id: 'project-wp-id' });

      const result = await service.syncProposal('proposal-123', mockFdpgUser);

      // Should return failure even though sync completed
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sync was cancelled or failed');

      // Should NOT have updated the status to SYNCED
      expect(failedProposal.registerInfo.syncStatus).toBe(SyncStatus.SyncFailed);
    });

    it('should update existing project if acptPluginId exists', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const proposalWithId = {
        ...mockProposal,
        _id: mockProposal._id,
        registerInfo: {
          ...mockProposal.registerInfo,
          acptPluginId: 'existing-wp-id',
        },
        save: mockSave,
      };

      (proposalModel.findById as jest.Mock).mockResolvedValue(proposalWithId);

      // Mock researcher sync
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');

      // Mock location sync
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');

      // Mock project update
      (acptPluginClient.updateProject as jest.Mock).mockResolvedValue({ id: 'existing-wp-id' });

      await service.syncProposal('proposal-123', mockFdpgUser);

      expect(acptPluginClient.updateProject).toHaveBeenCalledWith(
        'existing-wp-id',
        expect.objectContaining({
          title: 'Test Project',
          status: 'publish',
        }),
      );
      expect(acptPluginClient.createProject).not.toHaveBeenCalled();
    });

    it('should separate desired locations from participant institutes', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const proposalWithParticipants = {
        ...mockProposal,
        _id: mockProposal._id,
        participants: [
          {
            institute: {
              miiLocation: null,
              name: 'Custom Institute',
              isDone: true,
              _id: 'custom-inst-123',
            },
          },
        ],
        save: mockSave,
      };

      (proposalModel.findById as jest.Mock).mockResolvedValue(proposalWithParticipants);

      // Mock researcher sync
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');

      // Mock location sync - return different IDs for different locations
      (acptPluginClient.findLocationByName as jest.Mock)
        .mockResolvedValueOnce('location-id-1') // Charité
        .mockResolvedValueOnce('location-id-2') // UKOWL
        .mockResolvedValueOnce('location-id-3'); // Custom Institute

      // Mock project creation
      (acptPluginClient.createProject as jest.Mock).mockResolvedValue({ id: 'project-wp-id' });

      await service.syncProposal('proposal-123', mockFdpgUser);

      // Verify locations were queried separately
      expect(acptPluginClient.findLocationByName).toHaveBeenCalledTimes(3);
      expect(acptPluginClient.findLocationByName).toHaveBeenCalledWith('Charité');
      expect(acptPluginClient.findLocationByName).toHaveBeenCalledWith('UKOWL');
      expect(acptPluginClient.findLocationByName).toHaveBeenCalledWith('Custom Institute');

      // Verify the payload has separate arrays
      expect(acptPluginClient.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          acpt: expect.objectContaining({
            meta: expect.arrayContaining([
              expect.objectContaining({
                field: 'fdpgx-location',
                value: ['location-id-1', 'location-id-2'],
              }),
              expect.objectContaining({
                field: 'fdpgx-participantsinstitute',
                value: ['location-id-3'],
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('syncAllProposals', () => {
    it('should sync all eligible proposals', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const proposal1 = { ...mockProposal, _id: 'proposal-1', projectAbbreviation: 'TEST-001', save: mockSave };
      const proposal2 = { ...mockProposal, _id: 'proposal-2', projectAbbreviation: 'TEST-002', save: mockSave };
      const proposals = [proposal1, proposal2];

      (proposalModel.find as jest.Mock).mockResolvedValue(proposals);
      (proposalModel.findById as jest.Mock).mockImplementation((id) => {
        const found = proposals.find((p) => p._id === id);
        return Promise.resolve(found || { ...mockProposal, _id: id, save: mockSave });
      });

      // Mock all external calls
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');
      (acptPluginClient.createProject as jest.Mock).mockResolvedValue({ id: 'project-wp-id' });

      const result = await service.syncAllProposals(mockFdpgUser);

      expect(result.total).toBe(2);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw BadRequestException if no proposals to sync', async () => {
      (proposalModel.find as jest.Mock).mockResolvedValue([]);

      await expect(service.syncAllProposals(mockFdpgUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('retrySync', () => {
    it('should increment retry count and retry sync', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockProposal);
      const proposalWithRetry = {
        ...mockProposal,
        _id: mockProposal._id,
        registerInfo: {
          ...mockProposal.registerInfo,
          syncStatus: SyncStatus.SyncFailed,
          syncRetryCount: 1,
        },
        save: mockSave,
      };

      (proposalModel.findById as jest.Mock).mockResolvedValue(proposalWithRetry);

      // Mock external calls
      (acptPluginClient.findResearcherByName as jest.Mock).mockResolvedValue('researcher-wp-id');
      (acptPluginClient.findLocationByName as jest.Mock).mockResolvedValue('location-wp-id');
      (acptPluginClient.createProject as jest.Mock).mockResolvedValue({ id: 'project-wp-id' });

      await service.retrySync('proposal-123', mockFdpgUser);

      // Verify retry count was incremented and saved
      expect(mockSave).toHaveBeenCalled();
      expect(proposalWithRetry.registerInfo.syncRetryCount).toBe(2);
    });
  });
});
