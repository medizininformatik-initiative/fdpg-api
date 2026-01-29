import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../schema/proposal.schema';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalType } from '../../enums/proposal-type.enum';
import { Role } from 'src/shared/enums/role.enum';
import { validateStatusChange } from '../validate-status-change.util';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { SyncStatus } from '../../enums/sync-status.enum';

describe('validateStatusChange', () => {
  let baseProposal: Proposal;
  let ownerUser: IRequestUser;
  let otherResearcher: IRequestUser;
  let fdpgMember: IRequestUser;
  let dataSourceMember: IRequestUser;
  let dizUser: IRequestUser;
  let registeringMemberUser: IRequestUser;

  beforeEach(() => {
    // Minimal proposal object; additional fields are not used by validateStatusChange
    baseProposal = {
      ownerId: 'owner-123',
      status: ProposalStatus.Draft,
    } as unknown as Proposal;

    ownerUser = {
      singleKnownRole: Role.Researcher,
      userId: 'owner-123',
      roles: [Role.Researcher],
    } as IRequestUser;

    otherResearcher = {
      singleKnownRole: Role.Researcher,
      userId: 'someone-else',
      roles: [Role.Researcher],
    } as IRequestUser;

    fdpgMember = {
      singleKnownRole: Role.FdpgMember,
      userId: 'fdpg-1',
      roles: [Role.FdpgMember],
    } as IRequestUser;

    dataSourceMember = {
      singleKnownRole: Role.DataSourceMember,
      userId: 'ds-1',
      roles: [Role.DataSourceMember],
    } as IRequestUser;

    dizUser = {
      singleKnownRole: Role.DizMember,
      userId: 'diz-1',
      roles: [Role.DizMember],
    } as IRequestUser;

    registeringMemberUser = {
      singleKnownRole: Role.RegisteringMember,
      userId: 'register-1',
      roles: [Role.RegisteringMember],
    } as IRequestUser;
  });

  describe('missing mappings and forbidden defaults', () => {
    it('throws when there is no mapping for the given transition', () => {
      // Default status is Draft; mapping exists only for Draft->FdpgCheck
      // Draft->Rejected is not mapped
      expect(() =>
        validateStatusChange({ ...baseProposal, status: ProposalStatus.Draft }, ProposalStatus.Rejected, ownerUser),
      ).toThrow(ValidationException);

      // Archived has empty mapping
      expect(() =>
        validateStatusChange({ ...baseProposal, status: ProposalStatus.Archived }, ProposalStatus.Draft, ownerUser),
      ).toThrow(ValidationException);
    });
  });

  describe('Draft -> FdpgCheck', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.Draft;
    });

    it('allows when user is owner (Researcher)', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, ownerUser)).not.toThrow();
    });

    it('throws when user is not owner (Researcher with different userId)', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, otherResearcher)).toThrow(
        ValidationException,
      );
    });

    it('throws when user is FdpgMember (isOwner false)', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, fdpgMember)).toThrow(
        ValidationException,
      );
    });

    it('throws when user is DataSourceMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, dataSourceMember)).toThrow(
        ValidationException,
      );
    });
  });

  describe('Rework -> FdpgCheck', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.Rework;
    });

    it('allows when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, ownerUser)).not.toThrow();
    });

    it('throws when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, fdpgMember)).toThrow(
        ValidationException,
      );
    });
  });

  describe('Rejected -> Archived', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.Rejected;
    });

    it('allows when user is owner (Researcher)', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, ownerUser)).not.toThrow();
    });

    it('allows when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, fdpgMember)).not.toThrow();
    });

    it('allows when user is DataSourceMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, dataSourceMember)).not.toThrow();
    });

    it('throws when user is Researcher but not owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, otherResearcher)).toThrow(
        ValidationException,
      );
    });

    it('throws when user is DizMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, dizUser)).toThrow(ValidationException);
    });
  });

  describe('FdpgCheck -> Rework / Rejected / LocationCheck', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.FdpgCheck;
    });

    it('allows Rework when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rework, fdpgMember)).not.toThrow();
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rework, dataSourceMember)).not.toThrow();
    });

    it('throws Rework when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rework, ownerUser)).toThrow(ValidationException);
    });

    it('allows Rejected when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rejected, fdpgMember)).not.toThrow();
    });

    it('allows LocationCheck when user is DataSourceMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.LocationCheck, dataSourceMember)).not.toThrow();
    });

    it('throws LocationCheck when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.LocationCheck, ownerUser)).toThrow(
        ValidationException,
      );
    });
  });

  describe('LocationCheck -> Contracting / Rejected', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.LocationCheck;
    });

    it('allows Contracting when forceThrow is false (any user)', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Contracting, ownerUser, false)).not.toThrow();
      expect(() =>
        validateStatusChange(baseProposal, ProposalStatus.Contracting, otherResearcher, false),
      ).not.toThrow();
    });

    it('throws Contracting when forceThrow is true', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Contracting, fdpgMember, true)).toThrow(
        ValidationException,
      );
    });

    it('allows Rejected when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rejected, fdpgMember)).not.toThrow();
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rejected, dataSourceMember)).not.toThrow();
    });

    it('throws Rejected when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rejected, ownerUser)).toThrow(ValidationException);
    });
  });

  describe('Contracting -> ExpectDataDelivery / Rejected', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.Contracting;
    });

    it('allows ExpectDataDelivery when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.ExpectDataDelivery, fdpgMember)).not.toThrow();
      expect(() =>
        validateStatusChange(baseProposal, ProposalStatus.ExpectDataDelivery, dataSourceMember),
      ).not.toThrow();
    });

    it('throws ExpectDataDelivery when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.ExpectDataDelivery, ownerUser)).toThrow(
        ValidationException,
      );
    });

    it('allows Rejected when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rejected, ownerUser)).not.toThrow();
    });

    it('throws Rejected when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Rejected, fdpgMember)).toThrow(
        ValidationException,
      );
    });
  });

  describe('ExpectDataDelivery -> DataResearch', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.ExpectDataDelivery;
    });

    it('allows when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataResearch, fdpgMember)).not.toThrow();
    });

    it('throws when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataResearch, ownerUser)).toThrow(
        ValidationException,
      );
    });
  });

  describe('DataResearch -> DataCorrupt / FinishedProject', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.DataResearch;
    });

    it('allows FinishedProject when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FinishedProject, ownerUser)).not.toThrow();
    });

    it('throws DataCorrupt when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataCorrupt, fdpgMember)).toThrow(
        ValidationException,
      );
    });
  });

  describe('DataCorrupt -> ExpectDataDelivery / DataResearch', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.DataCorrupt;
    });

    it('allows ExpectDataDelivery when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.ExpectDataDelivery, fdpgMember)).not.toThrow();
    });

    it('allows DataResearch when user is DataSourceMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataResearch, dataSourceMember)).not.toThrow();
    });

    it('throws ExpectDataDelivery when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.ExpectDataDelivery, ownerUser)).toThrow(
        ValidationException,
      );
    });
  });

  describe('FinishedProject -> DataResearch / ReadyToArchive', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.FinishedProject;
    });

    it('allows DataResearch when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataResearch, fdpgMember)).not.toThrow();
    });

    it('allows ReadyToArchive when user is DataSourceMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.ReadyToArchive, dataSourceMember)).not.toThrow();
    });

    it('throws DataResearch when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataResearch, ownerUser)).toThrow(
        ValidationException,
      );
    });
  });

  describe('ReadyToArchive -> Archived', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.ReadyToArchive;
    });

    it('allows Archived when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, ownerUser)).not.toThrow();
    });

    it('allows Archived when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, fdpgMember)).not.toThrow();
    });

    it('allows Archived when user is DataSourceMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, dataSourceMember)).not.toThrow();
    });

    it('throws Archived when user is other Researcher', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.Archived, otherResearcher)).toThrow(
        ValidationException,
      );
    });
  });

  describe('Registering Form Status Transitions', () => {
    describe('Draft -> FdpgCheck (Registering Form)', () => {
      beforeEach(() => {
        baseProposal.status = ProposalStatus.Draft;
        baseProposal.type = ProposalType.RegisteringForm;
        baseProposal.registerInfo = {
          isInternalRegistration: false,
          legalBasis: true,
          diagnoses: ['D1234'],
          procedures: ['P5678'],
          projectCategory: 'Some Category',
          isDone: false,
          _id: 'internal-registration-123',
          syncStatus: SyncStatus.NotSynced,
          syncRetryCount: 0,
          locations: [],
          startTime: null,
        };
        registeringMemberUser.userId = 'owner-123';
        baseProposal.ownerId = 'owner-123';
      });

      it('allows RegisteringMember owner to submit registering form', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, registeringMemberUser)).not.toThrow();
      });

      it('throws when RegisteringMember is not the owner', () => {
        registeringMemberUser.userId = 'different-user';
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, registeringMemberUser)).toThrow(
          ValidationException,
        );
      });

      it('allows regular researcher owner to submit (isOwner check)', () => {
        // Even for registering forms, if the researcher is the owner, they can submit
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, ownerUser)).not.toThrow();
      });

      it('throws when regular researcher (not owner) tries to submit registering form', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, otherResearcher)).toThrow(
          ValidationException,
        );
      });

      it('allows FDPG member to submit any registering form (regardless of ownership)', () => {
        // FDPG should be able to submit registering forms even if they don't own them
        baseProposal.ownerId = 'different-owner';
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, fdpgMember)).not.toThrow();
      });
    });

    describe('FdpgCheck -> ReadyToPublish (Registering Form Only)', () => {
      beforeEach(() => {
        baseProposal.status = ProposalStatus.FdpgCheck;
        baseProposal.type = ProposalType.RegisteringForm;
        baseProposal.registerInfo = {
          isInternalRegistration: false,
          legalBasis: true,
          diagnoses: ['D1234'],
          procedures: ['P5678'],
          projectCategory: 'Some Category',
          isDone: false,
          _id: 'internal-registration-123',
          syncStatus: SyncStatus.NotSynced,
          syncRetryCount: 0,
          locations: [],
          startTime: null,
        };
      });

      it('allows FdpgMember to approve registering form', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.ReadyToPublish, fdpgMember)).not.toThrow();
      });

      it('allows DataSourceMember to approve registering form', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.ReadyToPublish, dataSourceMember)).not.toThrow();
      });

      it('throws when proposal is not a registering form', () => {
        delete baseProposal.type;
        delete baseProposal.registerInfo;
        expect(() => validateStatusChange(baseProposal, ProposalStatus.ReadyToPublish, fdpgMember)).toThrow(
          ValidationException,
        );
      });

      it('throws when owner tries to approve', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.ReadyToPublish, ownerUser)).toThrow(
          ValidationException,
        );
      });

      it('throws for regular proposals (not registering forms)', () => {
        baseProposal.type = ProposalType.ApplicationForm;
        expect(() => validateStatusChange(baseProposal, ProposalStatus.ReadyToPublish, fdpgMember)).toThrow(
          ValidationException,
        );
      });
    });

    describe('FdpgCheck -> Rework (Registering Form)', () => {
      beforeEach(() => {
        baseProposal.status = ProposalStatus.FdpgCheck;
        baseProposal.type = ProposalType.RegisteringForm;
        baseProposal.registerInfo = {
          isInternalRegistration: false,
          legalBasis: true,
          diagnoses: ['D1234'],
          procedures: ['P5678'],
          projectCategory: 'Some Category',
          isDone: false,
          _id: 'internal-registration-123',
          syncStatus: SyncStatus.NotSynced,
          syncRetryCount: 0,
          locations: [],
          startTime: null,
        };
      });

      it('allows FdpgMember to send back for rework', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.Rework, fdpgMember)).not.toThrow();
      });

      it('allows DataSourceMember to send back for rework', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.Rework, dataSourceMember)).not.toThrow();
      });
    });

    describe('Rework -> FdpgCheck (Registering Form)', () => {
      beforeEach(() => {
        baseProposal.status = ProposalStatus.Rework;
        baseProposal.type = ProposalType.RegisteringForm;
        baseProposal.registerInfo = {
          isInternalRegistration: false,
          legalBasis: true,
          diagnoses: ['D1234'],
          procedures: ['P5678'],
          projectCategory: 'Some Category',
          isDone: false,
          _id: 'internal-registration-123',
          syncStatus: SyncStatus.NotSynced,
          syncRetryCount: 0,
          locations: [],
          startTime: null,
        };
        registeringMemberUser.userId = 'owner-123';
        baseProposal.ownerId = 'owner-123';
      });

      it('allows RegisteringMember owner to resubmit', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, registeringMemberUser)).not.toThrow();
      });

      it('throws when RegisteringMember is not the owner', () => {
        registeringMemberUser.userId = 'different-user';
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, registeringMemberUser)).toThrow(
          ValidationException,
        );
      });

      it('allows FDPG member to resubmit any registering form (regardless of ownership)', () => {
        // FDPG should be able to resubmit registering forms from Rework even if they don't own them
        baseProposal.ownerId = 'different-owner';
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, fdpgMember)).not.toThrow();
      });
    });

    describe('ReadyToPublish -> Published (Automated)', () => {
      beforeEach(() => {
        baseProposal.status = ProposalStatus.ReadyToPublish;
        baseProposal.type = ProposalType.RegisteringForm;
        baseProposal.registerInfo = {
          isInternalRegistration: false,
          legalBasis: true,
          diagnoses: ['D1234'],
          procedures: ['P5678'],
          projectCategory: 'Some Category',
          isDone: false,
          _id: 'internal-registration-123',
          syncStatus: SyncStatus.NotSynced,
          syncRetryCount: 0,
          locations: [],
          startTime: null,
        };
      });

      it('allows automated transition (forceThrow=false)', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.Published, fdpgMember, false)).not.toThrow();
      });

      it('throws for manual transition (forceThrow=true)', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.Published, fdpgMember, true)).toThrow(
          ValidationException,
        );
      });
    });

    describe('Internal Registration Workflow', () => {
      beforeEach(() => {
        baseProposal.status = ProposalStatus.Draft;
        baseProposal.type = ProposalType.RegisteringForm;
        baseProposal.registerInfo = {
          isInternalRegistration: true,
          legalBasis: true,
          diagnoses: ['D1234'],
          procedures: ['P5678'],
          projectCategory: 'Some Category',
          isDone: false,
          _id: 'internal-registration-123',
          syncStatus: SyncStatus.NotSynced,
          syncRetryCount: 0,
          locations: [],
          startTime: null,
        };
        // Internal registrations keep the original owner, so FDPG creates them but owner submits
        baseProposal.ownerId = 'owner-123';
      });

      it('allows original owner to submit internal registration', () => {
        // Internal registrations are created by FDPG but submitted by the original owner
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, ownerUser)).not.toThrow();
      });

      it('throws when non-owner tries to submit internal registration', () => {
        expect(() => validateStatusChange(baseProposal, ProposalStatus.FdpgCheck, otherResearcher)).toThrow(
          ValidationException,
        );
      });
    });
  });
});
