import { ForbiddenException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';

export const getFilterForDmo = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  const allowedQuery = [PanelQuery.DmoPending, PanelQuery.DmoApproved];

  console.warn('TODO Adjust filter query with actual entries');

  if (allowedQuery.includes(panelQuery)) {
    switch (panelQuery) {
      case PanelQuery.DmoPending:
        return getFilterForPending(user);
      case PanelQuery.DmoApproved:
        return getFilterForApproved(user);
    }
  } else {
    throw new ForbiddenException();
  }
};

const getFilterForApproved = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    $and: [
      {
        'dataDelivery.status': {
          $in: ['APPROVED'],
        },
      },
      { 'dataDelivery.location': user.miiLocation },
    ],
  };
};

const getFilterForPending = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    $and: [
      {
        'dataDelivery.status': {
          $in: ['PENDING'],
        },
      },
      { 'dataDelivery.location': user.miiLocation },
    ],
  };
};
