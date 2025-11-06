import { ForbiddenException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';

export const getFilterForDiz = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  const allowedQuery = [
    PanelQuery.DizComingUp,
    PanelQuery.DizRequested,
    PanelQuery.DizPending,
    PanelQuery.DizOngoing,
    PanelQuery.DizFinished,
    PanelQuery.Archived,
  ];

  if (allowedQuery.includes(panelQuery)) {
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
      case PanelQuery.Archived:
        return getFilterForArchived(user);
    }
  } else {
    throw new ForbiddenException();
  }
};

const getFilterQueryForComingUp = (user: IRequestUser): FilterQuery<Proposal> => {
  console.log('COMING UP REQ');
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
