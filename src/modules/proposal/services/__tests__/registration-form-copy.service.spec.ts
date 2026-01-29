import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { RegistrationFormCopyService } from '../registration-form-copy.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { StatusChangeService } from '../status-change.service';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';
import { Proposal } from '../../schema/proposal.schema';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalType } from '../../enums/proposal-type.enum';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { HistoryEventType } from '../../enums/history-event.enum';
import { ProposalTypeOfUse } from '../../enums/proposal-type-of-use.enum';

describe('RegistrationFormCopyService', () => {
  let service: RegistrationFormCopyService;
  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let statusChangeService: jest.Mocked<StatusChangeService>;
  let proposalFormService: jest.Mocked<ProposalFormService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationFormCopyService,
        {
          provide: getModelToken(Proposal.name),
          useValue: jest.fn(),
        },
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: StatusChangeService,
          useValue: {
            handleEffects: jest.fn(),
          },
        },
        {
          provide: ProposalFormService,
          useValue: {
            getCurrentVersion: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RegistrationFormCopyService>(RegistrationFormCopyService);
    proposalCrudService = module.get(ProposalCrudService);
    statusChangeService = module.get(StatusChangeService);
    proposalFormService = module.get(ProposalFormService);
  });

  describe('copyAsInternalRegistration', () => {
    const proposalId = 'proposal-id';
    let originalProposal: any;
    let fdpgRequest: FdpgRequest;

    beforeEach(() => {
      originalProposal = {
        _id: proposalId,
        projectAbbreviation: 'ORIGINAL-PROJECT',
        dataSourceLocaleId: 'DIFE-12345',
        status: ProposalStatus.Contracting,
        owner: { id: 'owner-id', name: 'Owner Name' },
        ownerId: 'owner-id',
        ownerName: 'Owner Name',
        applicant: {
          researcher: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          institute: { name: 'Institute A' },
          participantCategory: 'Category A',
        },
        projectResponsible: {
          researcher: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
          institute: { name: 'Institute B' },
          participantCategory: 'Category B',
          projectResponsibility: {
            applicantIsProjectResponsible: false,
          },
        },
        participants: [{ researcher: { email: 'participant@example.com' } }],
        userProject: {
          projectDetails: {
            isDone: true,
          },
          typeOfUse: {
            isDone: true,
            usage: [ProposalTypeOfUse.Distributed],
          },
        },
        history: [],
        version: { mayor: 0, minor: 0 },
        toObject: jest.fn().mockReturnThis(),
        save: jest.fn().mockResolvedValue({ _id: 'new-proposal-id' }),
      };

      fdpgRequest = {
        user: {
          userId: 'fdpg-user-id',
          username: 'FDPG User',
          firstName: 'FDPG',
          lastName: 'User',
          email: 'fdpg@example.com',
          miiLocation: 'fdpg-location',
          singleKnownRole: Role.FdpgMember,
          roles: [Role.FdpgMember],
        },
      } as FdpgRequest;

      // Mock the findDocument to return the original proposal
      proposalCrudService.findDocument.mockResolvedValue(originalProposal);

      // Mock the proposalModel constructor to return a mock with save method
      const mockProposalModel = jest.fn().mockImplementation((data) => {
        // Create a new mock object for the new proposal instead of mutating originalProposal
        const newProposal = {
          ...data,
          history: data.history || [],
          save: jest.fn().mockResolvedValue({ _id: 'new-proposal-id' }),
        };
        // Store reference to new proposal for assertions
        originalProposal._newProposalRef = newProposal;
        return newProposal;
      });

      // Replace proposalModel in the service
      (service as any).proposalModel = mockProposalModel;
      (service as any).proposalModel.findOne = jest.fn().mockResolvedValue(null);

      (statusChangeService.handleEffects as jest.Mock).mockResolvedValue(undefined);
      (proposalFormService.getCurrentVersion as jest.Mock).mockResolvedValue({ mayor: 1, minor: 0 });
    });

    it('should create internal registration copy with correct flags', async () => {
      const result = await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(result).toBe('new-proposal-id');
      expect(newProposal.save).toHaveBeenCalled();
      // Verify type and registerInfo are set correctly
      expect(newProposal.type).toBe(ProposalType.RegisteringForm);
      expect(newProposal.registerInfo).toEqual({
        isInternalRegistration: true,
        originalProposalId: proposalId,
        originalProposalStatus: ProposalStatus.Contracting,
        locations: [],
        startTime: null,
      });
    });

    it('should reset all isDone flags in copied proposal', async () => {
      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      // Verify isDone flags are reset
      expect(newProposal.userProject.projectDetails.isDone).toBe(false);
      expect(newProposal.userProject.typeOfUse.isDone).toBe(false);
    });

    it('should preserve original owner information', async () => {
      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.owner).toEqual({ id: 'owner-id', name: 'Owner Name' });
      expect(newProposal.ownerId).toBe('owner-id');
      expect(newProposal.ownerName).toBe('Owner Name');
    });

    it('should clear dataSourceLocaleId', async () => {
      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.dataSourceLocaleId).toBeUndefined();
    });

    it('should set status to Draft', async () => {
      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.status).toBe(ProposalStatus.Draft);
    });

    it('should generate unique project abbreviation', async () => {
      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.projectAbbreviation).toBe('ORIGINAL-PROJECT-REG');
    });

    it('should copy applicant data to projectResponsible when applicantIsProjectResponsible is true', async () => {
      originalProposal.projectResponsible.projectResponsibility.applicantIsProjectResponsible = true;

      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.projectResponsible.researcher).toEqual(originalProposal.applicant.researcher);
      expect(newProposal.projectResponsible.institute).toEqual(originalProposal.applicant.institute);
      expect(newProposal.projectResponsible.participantCategory).toBe(originalProposal.applicant.participantCategory);
      // Should set applicantIsProjectResponsible to false in the copy
      expect(newProposal.projectResponsible.projectResponsibility.applicantIsProjectResponsible).toBe(false);
    });

    it('should not copy applicant data when applicantIsProjectResponsible is false', async () => {
      const originalResponsible = { ...originalProposal.projectResponsible.researcher };

      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.projectResponsible.researcher).toEqual(originalResponsible);
    });

    it('should add history entry for internal registration', async () => {
      await service.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.history).toHaveLength(1);
      expect(newProposal.history[0].type).toBe(HistoryEventType.ProposalCopyAsInternalRegistration);
      expect(newProposal.history[0].owner).toEqual({
        firstName: 'FDPG',
        lastName: 'User',
        email: 'fdpg@example.com',
        id: 'fdpg-user-id',
        miiLocation: 'fdpg-location',
        role: Role.FdpgMember,
      });
      expect(newProposal.history[0].data).toEqual({
        originalProposalAbbreviation: 'ORIGINAL-PROJECT',
      });
      expect(newProposal.history[0].proposalVersion).toEqual({ mayor: 0, minor: 0 });
      expect(newProposal.history[0].createdAt).toBeInstanceOf(Date);
    });
  });
});
