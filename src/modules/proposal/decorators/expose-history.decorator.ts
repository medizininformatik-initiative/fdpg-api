import { RevertLocationVoteDto } from './../dto/revert-location-vote.dto';
import { Expose, plainToClass, Transform } from 'class-transformer';
import { parseGroupToUser } from 'src/shared/utils/user-group.utils';
import { HistoryEventGetDto } from '../dto/proposal/history-event.dto';
import { HistoryEvent } from '../schema/sub-schema/history-event.schema';
import { HistoryEventType } from '../enums/history-event.enum';

export const ExposeHistory = () => (target: object, propertyKey: string) => {
  Expose()(target, propertyKey);
  Transform((params) => {
    const user = parseGroupToUser(params.options.groups);
    const isFdpgMember = user.singleKnownRole === 'FdpgMember';

    const filteredEvents = params.obj[propertyKey].filter((event: HistoryEvent) => {
      const isRevertEvent = event.type === HistoryEventType.FdpgLocationVoteReverted;

      if (isRevertEvent && isFdpgMember) {
        return true;
      }
      return event.location ? event.location === user.miiLocation : true;
    });

    return filteredEvents.map((history) =>
      plainToClass(HistoryEventGetDto, history, { groups: params.options.groups }),
    );
  })(target, propertyKey);
};
