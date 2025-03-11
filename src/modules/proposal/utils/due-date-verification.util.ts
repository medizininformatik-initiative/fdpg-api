import { DueDateEnum } from '../enums/due-date.enum';

export const beforeDeadlineDateConstrains: Record<DueDateEnum, DueDateEnum | null> = {
  [DueDateEnum.DUE_DAYS_FDPG_CHECK]: null,
  [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: DueDateEnum.DUE_DAYS_FDPG_CHECK,
  [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: DueDateEnum.DUE_DAYS_LOCATION_CHECK,
  [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING,
  [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY,
  [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY,
};

const getMinDate = (deadlineType: DueDateEnum, deadlines: Record<DueDateEnum, Date | null>): Date | null => {
  if (!deadlines) {
    return null;
  }
  const beforeConstraint = beforeDeadlineDateConstrains[deadlineType];

  if (!beforeConstraint) {
    return null;
  }

  const date = deadlines[beforeConstraint] ? new Date(deadlines[beforeConstraint]) : null;

  if (!date) {
    getMinDate(beforeConstraint, deadlines);
  }

  return date;
};

const getMaxDate = (deadlineType: DueDateEnum, deadlines: Record<DueDateEnum, Date | null>): Date | null => {
  if (!deadlines) {
    return null;
  }

  const dates = Object.values(beforeDeadlineDateConstrains)
    .filter((value) => value === deadlineType)
    .map(([key]) => (deadlines[key] ? new Date(deadlines[key]) : null))
    .filter((date) => date);

  if (dates.length === 0) {
    return null;
  }

  // Return the earliest date
  return dates.reduce((earliest, current) => (current < earliest ? current : earliest));
};

export const isDateOrderValid = (updatedDeadlines: Record<DueDateEnum, Date | null>): boolean => {
  return Object.keys(updatedDeadlines)
    .map((deadlineType) => {
      const deadlineTypeEnum = deadlineType as DueDateEnum;
      const deadlineTypeDate = updatedDeadlines[deadlineType] ? new Date(updatedDeadlines[deadlineType]) : null;
      const minDate = getMinDate(deadlineTypeEnum, updatedDeadlines);
      const maxDate = getMaxDate(deadlineTypeEnum, updatedDeadlines);

      const isMinValid = minDate && deadlineTypeDate ? minDate.getTime() <= deadlineTypeDate.getTime() : true;
      const isMaxValid = maxDate && deadlineTypeDate ? maxDate.getTime() >= deadlineTypeDate.getTime() : true;

      return isMinValid && isMaxValid;
    })
    .every((valid) => valid);
};
