import { Expose, plainToClass, Transform } from 'class-transformer';
import { parseGroupToUser } from 'src/shared/utils/user-group.utils';
import { HistoryEventGetDto } from '../dto/proposal/history-event.dto';
import { HistoryEvent } from '../schema/sub-schema/history-event.schema';
import { HistoryEventType } from '../enums/history-event.enum';
import { Role } from 'src/shared/enums/role.enum';

const dataDeliveryHistoryVisibility = [
  {
    event: HistoryEventType.DmoRequest,
    allowedRoles: [Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice],
  },
  {
    event: HistoryEventType.DmoAccept,
    allowedRoles: [Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice],
  },
  {
    event: HistoryEventType.DmoDeny,
    allowedRoles: [Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice],
  },
  {
    event: HistoryEventType.DataDeliveryStarted,
    allowedRoles: [
      Role.FdpgMember,
      Role.DataSourceMember,
      Role.DataManagementOffice,
      Role.DizMember,
      Role.UacMember,
      Role.Researcher,
    ],
  },
  {
    event: HistoryEventType.DataDeliveryManualEntry,
    allowedRoles: [Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice, Role.DizMember, Role.UacMember],
  },
  {
    event: HistoryEventType.DataDeliveryCanceled,
    allowedRoles: [Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice, Role.DizMember, Role.UacMember],
  },
  {
    event: HistoryEventType.DataDeliveryForwarded,
    allowedRoles: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember, Role.Researcher],
  },
  {
    event: HistoryEventType.DataDeliveryConcluded,
    allowedRoles: [Role.FdpgMember, Role.DataSourceMember, Role.DataManagementOffice, Role.Researcher],
  },
];

export const ExposeHistory = () => (target: object, propertyKey: string) => {
  Expose()(target, propertyKey);
  Transform((params) => {
    const user = parseGroupToUser(params.options.groups);
    const isFdpgMember = user.singleKnownRole === Role.FdpgMember;

    const filteredEvents = (params.obj[propertyKey] || []).filter((event: HistoryEvent) => {
      const isRevertEvent = event.type === HistoryEventType.FdpgLocationVoteReverted;
      const isParticipantEvent = [
        HistoryEventType.ParticipantAdded,
        HistoryEventType.ParticipantRemoved,
        HistoryEventType.ParticipantUpdated,
      ].includes(event.type);

      const dataDeliveryEvent = dataDeliveryHistoryVisibility.find(
        (dataDeliveryEventVisibility) => dataDeliveryEventVisibility.event === event.type,
      );

      if (dataDeliveryEvent && [Role.UacMember, Role.DizMember].includes(user.singleKnownRole)) {
        return ((event.data?.locations as string[]) || []).includes(user.miiLocation ?? 'none');
      }

      if (dataDeliveryEvent) {
        return dataDeliveryEvent.allowedRoles.includes(user.singleKnownRole);
      }

      if (isRevertEvent && isFdpgMember) {
        return true;
      }

      if (isParticipantEvent) {
        return true;
      }

      if (event.type === HistoryEventType.ProjectAssigneChange) {
        return [Role.FdpgMember, Role.DataSourceMember].includes(user.singleKnownRole);
      }

      return event.location ? event.location === user.miiLocation : true;
    });

    return filteredEvents.map((history) =>
      plainToClass(HistoryEventGetDto, history, { groups: params.options.groups }),
    );
  })(target, propertyKey);
};
