import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { FilterQuery } from 'mongoose';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { getRegisterProposalsForUser } from '../proposal-filter.util';

export const getFilterForUac = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  const allowedQuery = [
    PanelQuery.UacPending,
    PanelQuery.UacOngoing,
    PanelQuery.UacFinished,
    PanelQuery.UacRequested,
    PanelQuery.PublishedDraft,
    PanelQuery.PublishedPending,
    PanelQuery.PublishedCompleted,
    PanelQuery.Archived,
  ];

  if (allowedQuery.includes(panelQuery)) {
    switch (panelQuery) {
      case PanelQuery.UacRequested:
        return getFilterForRequested(user);
      case PanelQuery.UacPending:
        return getFilterForPending(user);
      case PanelQuery.UacOngoing:
        return getFilterForOngoing(user);
      case PanelQuery.UacFinished:
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

const getFilterForRequested = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    status: ProposalStatus.LocationCheck,
    dizApprovedLocations: user.miiLocation,
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
      {
        $or: [
          { openDizChecks: user.miiLocation },
          { openDizConditionChecks: user.miiLocation },
          { uacApprovedLocations: user.miiLocation },
        ],
      },
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
  };
};
