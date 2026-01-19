import { ForbiddenException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getRegisterProposalsForUser } from '../proposal-filter.util';

export const dizAllowedQuery = [
  PanelQuery.DizComingUp,
  PanelQuery.DizRequested,
  PanelQuery.DizPending,
  PanelQuery.DizOngoing,
  PanelQuery.DizFinished,
  PanelQuery.PublishedDraft,
  PanelQuery.PublishedPending,
  PanelQuery.PublishedCompleted,
  PanelQuery.Archived,
];

export const getFilterForDiz = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  if (dizAllowedQuery.includes(panelQuery)) {
    switch (panelQuery) {
      case PanelQuery.DizComingUp:
        return getFilterQueryForComingUp(user);
      case PanelQuery.DizRequested:
        return getFilterForRequested(user);
      case PanelQuery.DizPending:
        return getFilterForPending(user);
      case PanelQuery.DizOngoing:
        return getFilterForOngoing(user);
      case PanelQuery.DizFinished:
        return getFilterForFinished(user);
      case PanelQuery.PublishedDraft:
        return getRegisterProposalsForUser(user, ProposalStatus.Draft);
      case PanelQuery.PublishedPending:
        return getRegisterProposalsForUser(user, [
          ProposalStatus.Rework,
          ProposalStatus.FdpgCheck,
          ProposalStatus.ReadyToPublish,
        ]);
      case PanelQuery.PublishedCompleted:
        return getRegisterProposalsForUser(user, [ProposalStatus.Published, ProposalStatus.Rejected]);
      case PanelQuery.Archived:
        return getFilterForArchived(user);
    }
  } else {
    throw new ForbiddenException();
  }
};

const getFilterQueryForComingUp = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    status: ProposalStatus.FdpgCheck,
    'userProject.addressees.desiredLocations': user.miiLocation,
    'fdpgChecklist.initialViewing': true,
    'fdpgChecklist.depthCheck': true,
  };
};

const getFilterForRequested = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    $and: [
      {
        status: {
          $in: [ProposalStatus.LocationCheck],
        },
      },
      { $or: [{ openDizChecks: user.miiLocation }, { openDizConditionChecks: user.miiLocation }] },
    ],
  };
};

const getFilterForPending = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    $and: [
      {
        status: {
          $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting],
        },
      },
      { $or: [{ dizApprovedLocations: user.miiLocation }, { uacApprovedLocations: user.miiLocation }] },
    ],
  };
};

const getFilterForOngoing = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    status: {
      $in: [
        ProposalStatus.Contracting,
        ProposalStatus.ExpectDataDelivery,
        ProposalStatus.DataResearch,
        ProposalStatus.FinishedProject,
        ProposalStatus.DataCorrupt,
      ],
    },
    signedContracts: user.miiLocation,
  };
};

const getFilterForFinished = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    $or: [
      { requestedButExcludedLocations: user.miiLocation },
      { status: ProposalStatus.ReadyToArchive, signedContracts: user.miiLocation },
      { status: ProposalStatus.Rejected, uacApprovedLocations: user.miiLocation },
      { status: ProposalStatus.Rejected, signedContracts: user.miiLocation },
    ],
  };
};

const getFilterForArchived = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    $or: [
      {
        $and: [
          {
            status: ProposalStatus.Archived,
          },
          {
            $or: [
              { requestedButExcludedLocations: user.miiLocation },
              { uacApprovedLocations: user.miiLocation },
              { signedContracts: user.miiLocation },
            ],
          },
        ],
      },
      {
        $or: [
          { ownerId: user.userId },
          { participants: { $elemMatch: { 'researcher.email': user.email } } },
          { 'projectResponsible.researcher.email': user.email },
        ],
        type: ProposalType.RegisteringForm,
        'registerInfo.isInternalRegistration': { $ne: true },
        'owner.role': { $ne: Role.FdpgMember },
        status: ProposalStatus.Archived,
      },
    ],
  };
};
