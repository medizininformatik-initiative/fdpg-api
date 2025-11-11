import { Expose, plainToClass, Transform } from 'class-transformer';
import { parseGroupToUser } from 'src/shared/utils/user-group.utils';
import { HistoryEventGetDto } from '../dto/proposal/history-event.dto';
import { HistoryEvent } from '../schema/sub-schema/history-event.schema';
import { HistoryEventType } from '../enums/history-event.enum';
import { Role } from 'src/shared/enums/role.enum';

export const ExposeHistory = () => (target: object, propertyKey: string) => {
  Expose()(target, propertyKey);
  Transform((params) => {
    const user = parseGroupToUser(params.options.groups);
    const isFdpgMember = user.singleKnownRole === Role.FdpgMember;

    const filteredEvents = params.obj[propertyKey].filter((event: HistoryEvent) => {
      const isRevertEvent = event.type === HistoryEventType.FdpgLocationVoteReverted;
      const isParticipantEvent = [
        HistoryEventType.ParticipantAdded,
        HistoryEventType.ParticipantRemoved,
        HistoryEventType.ParticipantUpdated,
      ].includes(event.type);

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
