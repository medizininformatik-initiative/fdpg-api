import {
  alterDaysOnDate,
  getDueDateForDataResearch,
  getDueDateForFdpgCheck,
  getDueDateForLocationCheck,
} from 'src/modules/proposal/utils/due-date.util';
import { ScheduleType } from '../enums/schedule-type.enum';
import { Schedule } from '../schema/schedule.schema';
import { IProposalScheduleEventSet } from '../types/schedule-event.types';
import { Types } from 'mongoose';

const DAYS_BEFORE_DUE_REMINDER_FDPG_CHECK = 0;
const DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_1 = -2 * 7;
const DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_2 = -3;
const DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_3 = 0;
const DAYS_BEFORE_DUE_REMINDER_RESEARCHER_PUBLICATIONS = -31;

export const getEventsFromSet = (eventSet: IProposalScheduleEventSet) => {
  const now = new Date();
  return eventSet.types.map((type) => {
    const event = new Schedule();
    event.createdAt = now;
    event.updatedAt = now;
    event.lockedUntil = now;
    event.numberOfTries = 0;
    event.referenceDocumentId = eventSet.proposal._id;
    event.type = type;
    event._id = new Types.ObjectId().toString();

    switch (type) {
      case ScheduleType.ReminderFdpgCheck: {
        const dueDate = getDueDateForFdpgCheck(now, [4, 0, 0]);
        event.dueAfter = alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_FDPG_CHECK);
        break;
      }

      case ScheduleType.ReminderLocationCheck1: {
        const dueDate = getDueDateForLocationCheck(now, [4, 0, 0]);
        event.dueAfter = alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_1);
        break;
      }

      case ScheduleType.ReminderLocationCheck2: {
        const dueDate = getDueDateForLocationCheck(now, [4, 0, 0]);
        event.dueAfter = alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_2);
        break;
      }

      case ScheduleType.ReminderLocationCheck3: {
        const dueDate = getDueDateForLocationCheck(now, [4, 0, 0]);
        event.dueAfter = alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_3);
        break;
      }

      case ScheduleType.ReminderResearcherPublications: {
        const dueDate = getDueDateForDataResearch(eventSet.proposal, [4, 0, 0]);
        event.dueAfter = alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_RESEARCHER_PUBLICATIONS);
        break;
      }
    }

    return event;
  });
};
