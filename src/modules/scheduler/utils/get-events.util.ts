import {
  alterDaysOnDate,
  alterOnDeadline,
  getDueDateForDataResearch,
  getDueDateForFdpgCheck,
  getDueDateForLocationCheck,
} from 'src/modules/proposal/utils/due-date.util';
import { ScheduleType } from '../enums/schedule-type.enum';
import { Schedule } from '../schema/schedule.schema';
import { IProposalScheduleEventSet } from '../types/schedule-event.types';
import { Types } from 'mongoose';
import { DueDateEnum } from 'src/modules/proposal/enums/due-date.enum';

const DAYS_BEFORE_DUE_REMINDER_FDPG_CHECK = 0;
const DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_1 = -2 * 7;
const DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_2 = -3;
const DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_3 = 0;
const DAYS_BEFORE_DUE_REMINDER_RESEARCHER_PUBLICATIONS = -31;

export const getEventsFromSet = (eventSet: IProposalScheduleEventSet) => {
  const now = new Date();
  return eventSet.types
    .map((type) => {
      const deadlines = eventSet.proposal.deadlines ?? ({} as Record<DueDateEnum, Date | null>);

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
          const deadline = deadlines.DUE_DAYS_FDPG_CHECK;
          const dueDate = getDueDateForFdpgCheck(now, [4, 0, 0]);
          event.dueAfter = deadline
            ? alterOnDeadline(deadline, DAYS_BEFORE_DUE_REMINDER_FDPG_CHECK, [4, 0, 0])
            : alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_FDPG_CHECK);

          break;
        }

        case ScheduleType.ReminderLocationCheck1: {
          const deadline = deadlines.DUE_DAYS_LOCATION_CHECK;
          const dueDate = getDueDateForLocationCheck(now, [4, 0, 0]);
          event.dueAfter = deadline
            ? alterOnDeadline(deadline, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_1, [4, 0, 0])
            : alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_1);
          break;
        }

        case ScheduleType.ReminderLocationCheck2: {
          const deadline = deadlines.DUE_DAYS_LOCATION_CHECK;
          const dueDate = getDueDateForLocationCheck(now, [4, 0, 0]);
          event.dueAfter = deadline
            ? alterOnDeadline(deadline, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_2, [4, 0, 0])
            : alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_2);
          break;
        }

        case ScheduleType.ReminderLocationCheck3: {
          const deadline = deadlines.DUE_DAYS_LOCATION_CHECK;
          const dueDate = getDueDateForLocationCheck(now, [4, 0, 0]);
          event.dueAfter = deadline
            ? alterOnDeadline(deadline, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_3, [4, 0, 0])
            : alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_LOCATION_CHECK_3);
          break;
        }

        case ScheduleType.ReminderResearcherPublications: {
          const dueDate = getDueDateForDataResearch(eventSet.proposal, [4, 0, 0]);
          event.dueAfter = alterDaysOnDate(dueDate, DAYS_BEFORE_DUE_REMINDER_RESEARCHER_PUBLICATIONS);
          break;
        }
      }

      if (event.dueAfter.getTime() < now.getTime()) {
        console.warn(`Execution time is before now for proposalId ${eventSet.proposal._id} and type ${type}`);
        return null;
      }

      return event;
    })
    .filter((event) => event);
};
