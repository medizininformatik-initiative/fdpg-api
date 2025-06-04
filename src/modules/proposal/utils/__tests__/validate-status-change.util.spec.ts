import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../schema/proposal.schema';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import { validateStatusChange } from '../validate-status-change.util';
import { ValidationException } from 'src/exceptions/validation/validation.exception';

describe('validateStatusChange', () => {
  let baseProposal: Proposal;
  let ownerUser: IRequestUser;
  let otherResearcher: IRequestUser;
  let fdpgMember: IRequestUser;
  let dataSourceMember: IRequestUser;
  let dizUser: IRequestUser;

  beforeEach(() => {
    // Minimal proposal object; additional fields are not used by validateStatusChange
    baseProposal = {
      ownerId: 'owner-123',
      status: ProposalStatus.Draft,
    } as unknown as Proposal;

    ownerUser = {
      singleKnownRole: Role.Researcher,
      userId: 'owner-123',
    } as IRequestUser;

    otherResearcher = {
      singleKnownRole: Role.Researcher,
      userId: 'someone-else',
    } as IRequestUser;

    fdpgMember = {
      singleKnownRole: Role.FdpgMember,
      userId: 'fdpg-1',
    } as IRequestUser;

    dataSourceMember = {
      singleKnownRole: Role.DataSourceMember,
      userId: 'ds-1',
    } as IRequestUser;

    dizUser = {
      singleKnownRole: Role.DizMember,
      userId: 'diz-1',
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

    it('allows DataCorrupt when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataCorrupt, ownerUser)).not.toThrow();
    });

    it('allows FinishedProject when user is owner', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FinishedProject, ownerUser)).not.toThrow();
    });

    it('throws DataCorrupt when user is FdpgMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.DataCorrupt, fdpgMember)).toThrow(
        ValidationException,
      );
    });

    it('throws FinishedProject when user is DataSourceMember', () => {
      expect(() => validateStatusChange(baseProposal, ProposalStatus.FinishedProject, dataSourceMember)).toThrow(
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
});
