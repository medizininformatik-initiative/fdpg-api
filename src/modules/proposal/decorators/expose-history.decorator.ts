import { Expose, plainToClass, Transform } from 'class-transformer';
import { parseGroupToUser } from 'src/shared/utils/user-group.utils';
import { HistoryEventGetDto } from '../dto/proposal/history-event.dto';
import { HistoryEvent } from '../schema/sub-schema/history-event.schema';

export const ExposeHistory = () => (target: Object, propertyKey: string) => {
  Expose()(target, propertyKey);
  Transform((params) => {
    const user = parseGroupToUser(params.options.groups);
    const filteredEvents = params.obj[propertyKey].filter((event: HistoryEvent) =>
      event.location ? event.location === user.miiLocation : true,
    );
    return filteredEvents.map((history) => plainToClass(HistoryEventGetDto, history));
  })(target, propertyKey);
};
