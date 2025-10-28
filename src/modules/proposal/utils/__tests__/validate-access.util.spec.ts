import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalDocument } from '../../schema/proposal.schema';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { Role } from 'src/shared/enums/role.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import {
  checkAccessForDizMember,
  checkAccessForUacMember,
  getMostAdvancedState,
  validateProposalAccess,
} from '../validate-access.util';
import { ForbiddenException } from '@nestjs/common';
import { LocationState } from '../../enums/location-state.enum';
import { Participant } from '../../schema/sub-schema/participant.schema';

describe('validateProposalAccess', () => {
  let baseProposal: ProposalDocument;
  let researcherUser: IRequestUser;
  let fdpgUser: IRequestUser;
  let dataSourceUser: IRequestUser;
  let dizUser: IRequestUser;
  let uacUser: IRequestUser;

  beforeEach(() => {
    // A minimal proposal template
    baseProposal = {
      owner: { id: 'owner-id' },
      participants: [{ researcher: { email: 'alice@example.com' } }],
      status: ProposalStatus.Draft,
      isLocked: false,
      selectedDataSources: [PlatformIdentifier.Mii],
      openDizChecks: [],
      dizApprovedLocations: [],
      openDizConditionChecks: [],
      uacApprovedLocations: [],
      conditionalApprovals: [],
      signedContracts: [],
      requestedButExcludedLocations: [],
      contractAcceptedByResearcher: false,
      contractRejectedByResearcher: false,
    } as unknown as ProposalDocument;

    researcherUser = {
      singleKnownRole: Role.Researcher,
      userId: 'alice-id',
      email: 'alice@example.com',
    } as IRequestUser;

    fdpgUser = {
      singleKnownRole: Role.FdpgMember,
      userId: 'fdpg-id',
      email: 'fdpg@example.com',
    } as IRequestUser;

    dataSourceUser = {
      singleKnownRole: Role.DataSourceMember,
      userId: 'ds-id',
      email: 'ds@example.com',
      assignedDataSources: [PlatformIdentifier.Mii],
    } as IRequestUser;

    dizUser = {
      singleKnownRole: Role.DizMember,
      userId: 'diz-id',
      miiLocation: MiiLocation.UKL,
      email: 'diz@example.com',
    } as IRequestUser;

    uacUser = {
      singleKnownRole: Role.UacMember,
      userId: 'uac-id',
      miiLocation: MiiLocation.UKL,
      email: 'uac@example.com',
    } as IRequestUser;
  });

  describe('RegisteringMember branch', () => {
    let registeringMemberUser: IRequestUser;
    let registeringProposal: ProposalDocument;

    beforeEach(() => {
      registeringMemberUser = {
        singleKnownRole: Role.RegisteringMember,
        userId: 'register-id',
        email: 'register@example.com',
        roles: [Role.RegisteringMember],
      } as IRequestUser;

      registeringProposal = {
        ...baseProposal,
        register: {
          isRegisteringForm: true,
          isInternalRegistration: false,
        },
      } as ProposalDocument;
    });

    it('allows RegisteringMember owner to access registering form', () => {
      registeringProposal.owner.id = 'register-id';
      expect(() => validateProposalAccess(registeringProposal, registeringMemberUser)).not.toThrow();
    });

    it('allows RegisteringMember participating scientist to access', () => {
      registeringProposal.owner.id = 'other-id';
      registeringProposal.participants = [{ researcher: { email: 'register@example.com' } } as any as Participant];
      expect(() => validateProposalAccess(registeringProposal, registeringMemberUser)).not.toThrow();
    });

    it('throws when RegisteringMember is not owner or participant', () => {
      registeringProposal.owner.id = 'other-id';
      registeringProposal.participants = [{ researcher: { email: 'someone-else@example.com' } } as any as Participant];
      expect(() => validateProposalAccess(registeringProposal, registeringMemberUser)).toThrow(ForbiddenException);
    });

    it('allows RegisteringMember with multi-role to access registering forms', () => {
      const multiRoleUser = {
        ...registeringMemberUser,
        singleKnownRole: Role.Researcher,
        roles: [Role.Researcher, Role.RegisteringMember],
      } as IRequestUser;
      registeringProposal.owner.id = 'register-id';
      expect(() => validateProposalAccess(registeringProposal, multiRoleUser)).not.toThrow();
    });
  });

  describe('Internal Registration Access', () => {
    let internalRegistrationProposal: ProposalDocument;

    beforeEach(() => {
      internalRegistrationProposal = {
        ...baseProposal,
        register: {
          isRegisteringForm: true,
          isInternalRegistration: true,
        },
        status: ProposalStatus.Draft,
      } as ProposalDocument;
    });

    it('allows FDPG member to access internal registration regardless of ownership', () => {
      internalRegistrationProposal.owner.id = 'different-owner';
      expect(() => validateProposalAccess(internalRegistrationProposal, fdpgUser)).not.toThrow();
    });

    it('allows FDPG member to modify internal registration in Draft status', () => {
      internalRegistrationProposal.owner.id = 'different-owner';
      expect(() => validateProposalAccess(internalRegistrationProposal, fdpgUser, true)).not.toThrow();
    });

    it("throws for non-FDPG members trying to access internal registration they don't own", () => {
      internalRegistrationProposal.owner.id = 'different-owner';
      const researcherUser = {
        singleKnownRole: Role.Researcher,
        userId: 'researcher-id',
        email: 'researcher@example.com',
        roles: [Role.Researcher],
      } as IRequestUser;
      expect(() => validateProposalAccess(internalRegistrationProposal, researcherUser)).toThrow(ForbiddenException);
    });
  });

  describe('Researcher branch', () => {
    it('allows owner researcher', () => {
      // researcherUser.userId !== baseProposal.owner.id, so change owner to match
      baseProposal.owner.id = 'alice-id';
      expect(() => validateProposalAccess(baseProposal, researcherUser)).not.toThrow();
    });

    it('allows participating scientist', () => {
      baseProposal.owner.id = 'other-id';
      baseProposal.participants = [{ researcher: { email: 'alice@example.com' } } as any as Participant];
      expect(() => validateProposalAccess(baseProposal, researcherUser)).not.toThrow();
    });

    it('forbids non-owner, non-participating researcher', () => {
      baseProposal.owner.id = 'other-id';
      baseProposal.participants = [{ researcher: { email: 'bob@example.com' } } as any as Participant];
      expect(() => validateProposalAccess(baseProposal, researcherUser)).toThrow(ForbiddenException);
    });
  });

  describe('FdpgMember branch', () => {
    it('throws if status is Draft and willBeModified=true', () => {
      baseProposal.status = ProposalStatus.Draft;
      expect(() => validateProposalAccess(baseProposal, fdpgUser, true)).toThrow(ForbiddenException);
    });

    it('allows if status is Draft but willBeModified=false', () => {
      baseProposal.status = ProposalStatus.Draft;
      expect(() => validateProposalAccess(baseProposal, fdpgUser, false)).not.toThrow();
    });

    it('allows non-draft regardless of willBeModified', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      expect(() => validateProposalAccess(baseProposal, fdpgUser, true)).not.toThrow();
      expect(() => validateProposalAccess(baseProposal, fdpgUser, false)).not.toThrow();
    });
  });

  describe('DataSourceMember branch', () => {
    it('throws if status is Draft and willBeModified=true', () => {
      baseProposal.status = ProposalStatus.Draft;
      expect(() => validateProposalAccess(baseProposal, dataSourceUser, true)).toThrow(ForbiddenException);
    });

    it('throws if no data source overlap', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.selectedDataSources = [PlatformIdentifier.DIFE];
      dataSourceUser.assignedDataSources = [PlatformIdentifier.Mii];
      expect(() => validateProposalAccess(baseProposal, dataSourceUser, false)).toThrow(ForbiddenException);
    });

    it('allows if has data source overlap', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.selectedDataSources = [PlatformIdentifier.Mii];
      dataSourceUser.assignedDataSources = [PlatformIdentifier.Mii];
      expect(() => validateProposalAccess(baseProposal, dataSourceUser, true)).not.toThrow();
    });
  });

  describe('DizMember branch', () => {
    it('throws if status is Draft', () => {
      baseProposal.status = ProposalStatus.Draft;
      expect(() => validateProposalAccess(baseProposal, dizUser)).toThrow(ForbiddenException);
    });

    it('throws if location not assigned in any valid state', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      // no openDizChecks, openDizConditionChecks, dizApprovedLocations, uacApprovedLocations, signedContracts, requestedButExcludedLocations include MiiLocation.UKL
      baseProposal.openDizChecks = [];
      baseProposal.openDizConditionChecks = [];
      baseProposal.dizApprovedLocations = [];
      baseProposal.uacApprovedLocations = [];
      baseProposal.signedContracts = [];
      baseProposal.requestedButExcludedLocations = [];
      expect(() => validateProposalAccess(baseProposal, dizUser)).toThrow(ForbiddenException);
    });

    it('allows if isDizCheck', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.openDizChecks = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, dizUser)).not.toThrow();
    });

    it('allows if openDizConditionChecks', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.openDizConditionChecks = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, dizUser)).not.toThrow();
    });

    it('allows if dizApprovedLocations', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.dizApprovedLocations = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, dizUser)).not.toThrow();
    });

    it('allows if uacApprovedLocations', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.uacApprovedLocations = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, dizUser)).not.toThrow();
    });

    it('allows if signedContracts', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.signedContracts = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, dizUser)).not.toThrow();
    });

    it('allows if requestedButExcludedLocations', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.requestedButExcludedLocations = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, dizUser)).not.toThrow();
    });
  });

  describe('UacMember branch', () => {
    it('throws if status is Draft', () => {
      baseProposal.status = ProposalStatus.Draft;
      expect(() => validateProposalAccess(baseProposal, uacUser)).toThrow(ForbiddenException);
    });

    it('throws if location not assigned or DIZ didn’t accept', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.openDizChecks = [];
      baseProposal.openDizConditionChecks = [];
      baseProposal.dizApprovedLocations = [];
      baseProposal.uacApprovedLocations = [];
      baseProposal.signedContracts = [];
      baseProposal.requestedButExcludedLocations = [];
      expect(() => validateProposalAccess(baseProposal, uacUser)).toThrow(ForbiddenException);
    });

    it('allows if isDizCheck', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.openDizChecks = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, uacUser)).not.toThrow();
    });

    it('allows if openDizConditionChecks', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.openDizConditionChecks = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, uacUser)).not.toThrow();
    });

    it('allows if dizApprovedLocations', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.dizApprovedLocations = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, uacUser)).not.toThrow();
    });

    it('allows if uacApprovedLocations', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.uacApprovedLocations = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, uacUser)).not.toThrow();
    });

    it('allows if signedContracts', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.signedContracts = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, uacUser)).not.toThrow();
    });

    it('allows if requestedButExcludedLocations', () => {
      baseProposal.status = ProposalStatus.LocationCheck;
      baseProposal.requestedButExcludedLocations = [MiiLocation.UKL];
      expect(() => validateProposalAccess(baseProposal, uacUser)).not.toThrow();
    });
  });
});

describe('getMostAdvancedState', () => {
  let proposal: Partial<{
    openDizChecks: string[];
    dizApprovedLocations: string[];
    openDizConditionChecks: string[];
    uacApprovedLocations: string[];
    conditionalApprovals: Array<{ location: string; isAccepted: boolean; reviewedAt?: Date }>;
    signedContracts: string[];
    requestedButExcludedLocations: string[];
    contractAcceptedByResearcher: boolean;
    contractRejectedByResearcher: boolean;
    status: ProposalStatus;
  }>;
  const user = { miiLocation: 'locX' };

  beforeEach(() => {
    proposal = {
      openDizChecks: [],
      dizApprovedLocations: [],
      openDizConditionChecks: [],
      uacApprovedLocations: [],
      conditionalApprovals: [],
      signedContracts: [],
      requestedButExcludedLocations: [],
      contractAcceptedByResearcher: false,
      contractRejectedByResearcher: false,
      status: ProposalStatus.LocationCheck,
    };
  });

  it('returns ConditionalApprovalDeclined when conditionalApproval reviewed and declined', () => {
    proposal.conditionalApprovals = [{ location: 'locX', isAccepted: false, reviewedAt: new Date() }];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.ConditionalApprovalDeclined);
  });

  it('returns ResearcherRejectedContract when contractRejectedByResearcher is true', () => {
    proposal.contractRejectedByResearcher = true;
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.ResearcherRejectedContract);
  });

  it('returns RequestedButExcluded when requestedButExcludedLocations includes user location', () => {
    proposal.requestedButExcludedLocations = ['locX'];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.RequestedButExcluded);
  });

  it('returns SignedContractAndContractingDone when signedContracts includes user location and status != Contracting', () => {
    proposal.signedContracts = ['locX'];
    proposal.status = ProposalStatus.LocationCheck;
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.SignedContractAndContractingDone);
  });

  it('returns SignedContract when signedContracts includes user location and status == Contracting', () => {
    proposal.signedContracts = ['locX'];
    proposal.status = ProposalStatus.Contracting;
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.SignedContract);
  });

  it('returns ResearcherAcceptedContract when contractAcceptedByResearcher is true', () => {
    proposal.contractAcceptedByResearcher = true;
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.ResearcherAcceptedContract);
  });

  it('returns ConditionalApprovalAccepted when conditionalApproval is found and isAccepted=true', () => {
    proposal.conditionalApprovals = [{ location: 'locX', isAccepted: true }];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.ConditionalApprovalAccepted);
  });

  it('returns ConditionalApprovalPending when conditionalApproval is found and isAccepted=false without reviewedAt', () => {
    proposal.conditionalApprovals = [{ location: 'locX', isAccepted: false }];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.ConditionalApprovalPending);
  });

  it('returns UacApproved when uacApprovedLocations includes user location', () => {
    proposal.uacApprovedLocations = ['locX'];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.UacApproved);
  });

  it('returns DizApproved when dizApprovedLocations includes user location', () => {
    proposal.dizApprovedLocations = ['locX'];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.DizApproved);
  });

  it('returns DizConditionCheck when openDizConditionChecks includes user location', () => {
    proposal.openDizConditionChecks = ['locX'];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.DizConditionCheck);
  });

  it('returns IsDizCheck when openDizChecks includes user location', () => {
    proposal.openDizChecks = ['locX'];
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.IsDizCheck);
  });

  it('returns NotRequested when no conditions match', () => {
    const state = getMostAdvancedState(proposal as any, user as any);
    expect(state).toBe(LocationState.NotRequested);
  });
});

describe('checkAccessForDizMember (direct)', () => {
  let proposal: Partial<{
    status: ProposalStatus;
    openDizChecks: string[];
    dizApprovedLocations: string[];
    openDizConditionChecks: string[];
    uacApprovedLocations: string[];
    signedContracts: string[];
    requestedButExcludedLocations: string[];
  }>;
  const user = { miiLocation: 'L1' };

  beforeEach(() => {
    proposal = {
      status: ProposalStatus.LocationCheck,
      openDizChecks: [],
      dizApprovedLocations: [],
      openDizConditionChecks: [],
      uacApprovedLocations: [],
      signedContracts: [],
      requestedButExcludedLocations: [],
    };
  });

  it('throws if status is Draft', () => {
    proposal.status = ProposalStatus.Draft;
    expect(() => checkAccessForDizMember(proposal as any, user as any)).toThrow(ForbiddenException);
  });

  it('throws if no location assigned', () => {
    expect(() => checkAccessForDizMember(proposal as any, user as any)).toThrow(ForbiddenException);
  });

  it('allows if isDizCheck', () => {
    proposal.openDizChecks = ['L1'];
    expect(() => checkAccessForDizMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if openDizConditionChecks', () => {
    proposal.openDizConditionChecks = ['L1'];
    expect(() => checkAccessForDizMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if dizApprovedLocations', () => {
    proposal.dizApprovedLocations = ['L1'];
    expect(() => checkAccessForDizMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if uacApprovedLocations', () => {
    proposal.uacApprovedLocations = ['L1'];
    expect(() => checkAccessForDizMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if signedContracts', () => {
    proposal.signedContracts = ['L1'];
    expect(() => checkAccessForDizMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if requestedButExcludedLocations', () => {
    proposal.requestedButExcludedLocations = ['L1'];
    expect(() => checkAccessForDizMember(proposal as any, user as any)).not.toThrow();
  });
});

describe('checkAccessForUacMember (direct)', () => {
  let proposal: Partial<{
    status: ProposalStatus;
    openDizChecks: string[];
    dizApprovedLocations: string[];
    openDizConditionChecks: string[];
    uacApprovedLocations: string[];
    signedContracts: string[];
    requestedButExcludedLocations: string[];
  }>;
  const user = { miiLocation: 'L1' };

  beforeEach(() => {
    proposal = {
      status: ProposalStatus.LocationCheck,
      openDizChecks: [],
      dizApprovedLocations: [],
      openDizConditionChecks: [],
      uacApprovedLocations: [],
      signedContracts: [],
      requestedButExcludedLocations: [],
    };
  });

  it('throws if status is Draft', () => {
    proposal.status = ProposalStatus.Draft;
    expect(() => checkAccessForUacMember(proposal as any, user as any)).toThrow(ForbiddenException);
  });

  it('throws if no location assigned or DIZ did not accept', () => {
    expect(() => checkAccessForUacMember(proposal as any, user as any)).toThrow(ForbiddenException);
  });

  it('allows if isDizCheck', () => {
    proposal.openDizChecks = ['L1'];
    expect(() => checkAccessForUacMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if openDizConditionChecks', () => {
    proposal.openDizConditionChecks = ['L1'];
    expect(() => checkAccessForUacMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if dizApprovedLocations', () => {
    proposal.dizApprovedLocations = ['L1'];
    expect(() => checkAccessForUacMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if uacApprovedLocations', () => {
    proposal.uacApprovedLocations = ['L1'];
    expect(() => checkAccessForUacMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if signedContracts', () => {
    proposal.signedContracts = ['L1'];
    expect(() => checkAccessForUacMember(proposal as any, user as any)).not.toThrow();
  });

  it('allows if requestedButExcludedLocations', () => {
    proposal.requestedButExcludedLocations = ['L1'];
    expect(() => checkAccessForUacMember(proposal as any, user as any)).not.toThrow();
  });
});
