import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ProposalType } from '../enums/proposal-type.enum';
import { Proposal } from '../schema/proposal.schema';

const isOwner = (user: IRequestUser, proposal: Proposal) =>
  user.singleKnownRole === Role.Researcher && user.userId === proposal.ownerId;

const isFdpg = (user: IRequestUser) =>
  user.singleKnownRole === Role.FdpgMember || user.singleKnownRole === Role.DataSourceMember;

const canSubmitRegisterForm = (user: IRequestUser, proposal: Proposal) =>
  proposal.type === ProposalType.RegisteringForm &&
  ((user.roles.includes(Role.RegisteringMember) && user.userId === proposal.ownerId) || isFdpg(user));

const isResearcherOrFdpg = (user: IRequestUser, proposal: Proposal) => isOwner(user, proposal) || isFdpg(user);

export const validateStatusChange = (
  toBeUpdated: Proposal,
  newStatus: ProposalStatus,
  user: IRequestUser,
  forceThrow = false,
) => {
  /** map[oldStatus][newStatus] */
  const map = {
    [ProposalStatus.Archived]: {},
    [ProposalStatus.Draft]: {
      [ProposalStatus.FdpgCheck]: () => isOwner(user, toBeUpdated) || canSubmitRegisterForm(user, toBeUpdated),
    },
    [ProposalStatus.Rejected]: {
      [ProposalStatus.Archived]: () => isResearcherOrFdpg(user, toBeUpdated),
    },
    [ProposalStatus.Rework]: {
      [ProposalStatus.FdpgCheck]: () => isOwner(user, toBeUpdated) || canSubmitRegisterForm(user, toBeUpdated),
    },
    [ProposalStatus.FdpgCheck]: {
      [ProposalStatus.Rework]: () => isFdpg(user),
      [ProposalStatus.Rejected]: () => isFdpg(user),
      [ProposalStatus.LocationCheck]: () => isFdpg(user),
      // Only allow ReadyToPublish for register proposals (deprecated - keeping for backwards compatibility)
      [ProposalStatus.ReadyToPublish]: () => isFdpg(user) && toBeUpdated.type === ProposalType.RegisteringForm,
      // Allow direct approval to Published for registering forms (auto-sync)
      [ProposalStatus.Published]: () => isFdpg(user) && toBeUpdated.type === ProposalType.RegisteringForm,
    },
    [ProposalStatus.LocationCheck]: {
      // Contracting is supposed to be started by uploading the contract draft
      [ProposalStatus.Contracting]: () => !forceThrow,
      [ProposalStatus.Rejected]: () => isFdpg(user),
    },
    [ProposalStatus.Contracting]: {
      [ProposalStatus.ExpectDataDelivery]: () => isFdpg(user),
      [ProposalStatus.Rejected]: () => isOwner(user, toBeUpdated),
    },
    [ProposalStatus.ExpectDataDelivery]: {
      // TODO: Automated API CALL
      [ProposalStatus.DataResearch]: () => isFdpg(user),
    },
    [ProposalStatus.DataResearch]: {
      [ProposalStatus.DataCorrupt]: () => isOwner(user, toBeUpdated),
      [ProposalStatus.FinishedProject]: () => isOwner(user, toBeUpdated),
      [ProposalStatus.DataResearchFinished]: () => isResearcherOrFdpg(user, toBeUpdated),
    },
    [ProposalStatus.DataCorrupt]: {
      [ProposalStatus.ExpectDataDelivery]: () => isFdpg(user),
      [ProposalStatus.DataResearch]: () => isFdpg(user),
    },
    [ProposalStatus.DataResearchFinished]: {
      [ProposalStatus.FinishedProject]: () => isResearcherOrFdpg(user, toBeUpdated),
    },
    [ProposalStatus.FinishedProject]: {
      [ProposalStatus.DataResearch]: () => isFdpg(user),
      [ProposalStatus.ReadyToArchive]: () => isFdpg(user),
    },
    [ProposalStatus.ReadyToArchive]: {
      [ProposalStatus.Archived]: () => isResearcherOrFdpg(user, toBeUpdated),
    },
    [ProposalStatus.ReadyToPublish]: {
      [ProposalStatus.Published]: () => !forceThrow, // API to Web Page (automated)
    },
    [ProposalStatus.Published]: {},
  };

  const canSwitch: boolean = map[toBeUpdated.status][newStatus] ? map[toBeUpdated.status][newStatus]() : false;

  if (!canSwitch) {
    throwValidationException(toBeUpdated.status, newStatus);
  }
};

const throwValidationException = (oldStatus: ProposalStatus, newStatus: ProposalStatus) => {
  const property = 'status';
  const errorInfo = new ValidationErrorInfo({
    constraint: 'switchStatus',
    message: `Status is not switchable: "Status ${oldStatus}" can not be changed to ${newStatus}`,
    property,
    code: BadRequestError.ProposalStatusNotSwitchable,
  });
  throw new ValidationException([errorInfo]);
};
