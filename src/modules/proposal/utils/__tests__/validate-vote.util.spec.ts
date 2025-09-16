import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../schema/proposal.schema';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import {
  validateDizApproval,
  validateDizConditionApproval,
  validateRevertLocationVote,
  validateUacApproval,
} from '../validate-vote.util';
import { ConditionalApproval } from '../../schema/sub-schema/conditional-approval.schema';
import { UacApproval } from '../../schema/sub-schema/uac-approval.schema';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { ForbiddenException } from '@nestjs/common';

describe('validateDizApproval', () => {
  let baseProposal: Proposal;
  let dizUser: IRequestUser;
  const loc: MiiLocation = MiiLocation.UKL;

  beforeEach(() => {
    baseProposal = {
      status: ProposalStatus.LocationCheck,
      openDizChecks: [],
      openDizConditionChecks: [],
      conditionalApprovals: [],
      uacApprovals: [],
      dizApprovedLocations: [],
      uacApprovedLocations: [],
      signedContracts: [],
      requestedButExcludedLocations: [],
    } as unknown as Proposal;

    dizUser = {
      singleKnownRole: Role.DizMember,
      userId: 'diz-1',
      miiLocation: loc,
      email: 'diz@example.com',
    } as IRequestUser;
  });

  it('throws if status is not LocationCheck', () => {
    baseProposal.status = ProposalStatus.Draft;
    expect(() => validateDizApproval(baseProposal, dizUser)).toThrow(
      'The current status does not allow to set the diz approval',
    );
  });

  it('allows when openDizChecks includes user location', () => {
    baseProposal.openDizChecks = [loc];
    expect(() => validateDizApproval(baseProposal, dizUser)).not.toThrow();
  });

  it('allows when conditionalApprovals has a pending approval for user location', () => {
    baseProposal.conditionalApprovals = [
      { location: loc, isAccepted: false, reviewedAt: undefined } as ConditionalApproval,
    ];
    expect(() => validateDizApproval(baseProposal, dizUser)).not.toThrow();
  });

  it('allows when uacApprovals includes user location', () => {
    baseProposal.uacApprovals = [{ location: loc } as UacApproval];
    expect(() => validateDizApproval(baseProposal, dizUser)).not.toThrow();
  });

  it('throws if neither openDizChecks nor canUpdateCondition', () => {
    // openDizChecks empty, conditionalApprovals empty, uacApprovals empty
    expect(() => validateDizApproval(baseProposal, dizUser)).toThrow(
      'The location is not allowed to provide a vote. It might have already voted',
    );
  });
});

describe('validateDizConditionApproval', () => {
  let baseProposal: Proposal;
  let dizUser: IRequestUser;
  const loc: MiiLocation = MiiLocation.UKL;

  beforeEach(() => {
    baseProposal = {
      status: ProposalStatus.LocationCheck,
      openDizChecks: [],
      openDizConditionChecks: [],
      conditionalApprovals: [],
      uacApprovals: [],
      dizApprovedLocations: [],
      uacApprovedLocations: [],
      signedContracts: [],
      requestedButExcludedLocations: [],
    } as unknown as Proposal;

    dizUser = {
      singleKnownRole: Role.DizMember,
      userId: 'diz-2',
      miiLocation: loc,
      email: 'diz2@example.com',
    } as IRequestUser;
  });

  it('throws if status is not LocationCheck', () => {
    baseProposal.status = ProposalStatus.Draft;
    expect(() => validateDizConditionApproval(baseProposal, dizUser)).toThrow(
      'DIZ members can only set condition approval during location check or contracting.',
    );
  });

  it('allows when openDizConditionChecks includes user location', () => {
    baseProposal.openDizConditionChecks = [loc];
    expect(() => validateDizConditionApproval(baseProposal, dizUser)).not.toThrow();
  });

  it('allows when conditionalApprovals has pending entry for user', () => {
    baseProposal.conditionalApprovals = [
      { location: loc, isAccepted: false, reviewedAt: undefined } as ConditionalApproval,
    ];
    expect(() => validateDizConditionApproval(baseProposal, dizUser)).not.toThrow();
  });

  it('allows when uacApprovals includes user location', () => {
    baseProposal.uacApprovals = [{ location: loc } as UacApproval];
    expect(() => validateDizConditionApproval(baseProposal, dizUser)).not.toThrow();
  });

  it('throws if neither openDizConditionChecks nor canUpdateCondition', () => {
    expect(() => validateDizConditionApproval(baseProposal, dizUser)).toThrow(
      'The location is not allowed to provide a vote. It might have already voted',
    );
  });

  it('allows for DIZ member in Contracting phase', () => {
    baseProposal.status = ProposalStatus.Contracting;
    baseProposal.openDizConditionChecks = [loc];
    expect(() => validateDizConditionApproval(baseProposal, dizUser)).not.toThrow();
  });

  it('throws for DIZ member in non-allowed phase', () => {
    baseProposal.status = ProposalStatus.DataResearch;
    expect(() => validateDizConditionApproval(baseProposal, dizUser)).toThrow(
      'DIZ members can only set condition approval during location check or contracting.',
    );
  });
});

describe('validateUacApproval', () => {
  let baseProposal: Proposal;
  let uacUser: IRequestUser;
  const loc: MiiLocation = MiiLocation.UKL;

  beforeEach(() => {
    baseProposal = {
      status: ProposalStatus.LocationCheck,
      dizApprovedLocations: [],
    } as unknown as Proposal;

    uacUser = {
      singleKnownRole: Role.UacMember,
      userId: 'uac-1',
      miiLocation: loc,
      email: 'uac@example.com',
    } as IRequestUser;
  });

  it('throws if status is not LocationCheck', () => {
    baseProposal.status = ProposalStatus.FdpgCheck;
    expect(() => validateUacApproval(baseProposal, uacUser)).toThrow(
      'The current status does not allow to set the uac approval',
    );
  });

  it('allows when dizApprovedLocations includes user location', () => {
    baseProposal.status = ProposalStatus.LocationCheck;
    baseProposal.dizApprovedLocations = [loc];
    expect(() => validateUacApproval(baseProposal, uacUser)).not.toThrow();
  });

  it('throws if dizApprovedLocations does not include user location', () => {
    baseProposal.status = ProposalStatus.LocationCheck;
    baseProposal.dizApprovedLocations = [];
    expect(() => validateUacApproval(baseProposal, uacUser)).toThrow(
      'The location is not allowed to provide a vote. It might have already voted',
    );
  });
});

describe('validateRevertLocationVote', () => {
  let baseProposal: Proposal;
  let fdpgUser: IRequestUser;
  let regularUser: IRequestUser;
  const loc: MiiLocation = MiiLocation.UKL;

  beforeEach(() => {
    baseProposal = {
      status: ProposalStatus.LocationCheck,
      openDizChecks: [],
    } as unknown as Proposal;

    fdpgUser = {
      singleKnownRole: Role.FdpgMember,
      userId: 'fdpg-2',
      email: 'fdpg2@example.com',
    } as IRequestUser;

    regularUser = {
      singleKnownRole: Role.Researcher,
      userId: 'res-2',
      email: 'res2@example.com',
    } as IRequestUser;
  });

  it('throws ValidationException if location is still in openDizChecks', () => {
    baseProposal.openDizChecks = [loc];
    try {
      validateRevertLocationVote(baseProposal, loc, fdpgUser);
      throw new Error('Expected ValidationException');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationException);
      const ve = err as ValidationException;
      expect(ve.validationErrors).toHaveLength(1);
      const info = ve.validationErrors[0] as ValidationErrorInfo;
      expect(info.constraint).toBe('validRevert');
      expect(info.property).toBe('location');
      expect(info.message).toBe(`The location ${loc} has not voted yet`);
      expect(info.code).toBe(BadRequestError.LocationRevertValidation);
    }
  });

  it('throws ForbiddenException if user is not FdpgMember or DataSourceMember', () => {
    baseProposal.openDizChecks = [];
    expect(() => validateRevertLocationVote(baseProposal, loc, regularUser)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException if status is not LocationCheck', () => {
    baseProposal.openDizChecks = [];
    baseProposal.status = ProposalStatus.Draft;
    expect(() => validateRevertLocationVote(baseProposal, loc, fdpgUser)).toThrow(
      'The current status does not allow to revert the location vote',
    );
  });

  it('allows when all conditions are satisfied', () => {
    baseProposal.openDizChecks = [];
    baseProposal.status = ProposalStatus.LocationCheck;
    expect(() => validateRevertLocationVote(baseProposal, loc, fdpgUser)).not.toThrow();
  });
});
