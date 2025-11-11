import { ForbiddenException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { DeliveryAcceptance } from 'src/modules/proposal/enums/data-delivery.enum';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';

export const getFilterForDmo = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  const allowedQuery = [PanelQuery.DmsPending, PanelQuery.DmsApproved];

  if (allowedQuery.includes(panelQuery)) {
    switch (panelQuery) {
      case PanelQuery.DmsPending:
        return getFilterForPending(user);
      case PanelQuery.DmsApproved:
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
        'dataDelivery.acceptance': {
          $in: [DeliveryAcceptance.ACCEPTED],
        },
      },
      { 'dataDelivery.dataManagementSite': user.miiLocation },
    ],
  };
};

const getFilterForPending = (user: IRequestUser): FilterQuery<Proposal> => {
  return {
    $and: [
      {
        'dataDelivery.acceptance': {
          $in: [DeliveryAcceptance.PENDING],
        },
      },
      { 'dataDelivery.dataManagementSite': user.miiLocation },
    ],
  };
};
