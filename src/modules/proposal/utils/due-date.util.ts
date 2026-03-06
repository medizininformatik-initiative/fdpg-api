import { defaultDueDateValues, DueDateEnum } from '../enums/due-date.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';

const DUE_DAYS_FDPG_CHECK = 1 * 7;
const DUE_DAYS_DATA_CORRUPT = 1 * 7;
const DUE_DAYS_FINISHED_PROJECT = 1 * 7 * 4 * 2; // 2 Months

const DUE_DAYS_LOCATION_CHECK = 8 * 7;
const DUE_DAYS_EXPECT_DATA_DELIVERY = 2 * 7;
const DUE_DAYS_LOCATION_CONTRACTING = 4 * 7;

type Time = [hours: number, minutes: number, seconds: number];

export const alterDaysOnDate = (date: Date, days: number) => {
  return days ? new Date(date.setDate(date.getDate() + days)) : date;
};

export const alterOnDeadline = (deadlineDate: Date, days: number, time: Time = [12, 0, 0]) => {
  const date = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate(), ...time);
  return alterDaysOnDate(date, days);
};

export const getDueDateForFdpgCheck = (referenceTime: Date = new Date(), time: Time = [12, 0, 0]) => {
  const todayAtTime = new Date(referenceTime.getFullYear(), referenceTime.getMonth(), referenceTime.getDate(), ...time);
  return alterDaysOnDate(todayAtTime, DUE_DAYS_FDPG_CHECK);
};

export const getDueDateForLocationCheck = (referenceTime: Date = new Date(), time: Time = [12, 0, 0]) => {
  const todayAtTime = new Date(referenceTime.getFullYear(), referenceTime.getMonth(), referenceTime.getDate(), ...time);
  return alterDaysOnDate(todayAtTime, DUE_DAYS_LOCATION_CHECK);
};

export const getDueDateForLocationContracting = (referenceTime: Date = new Date(), time: Time = [12, 0, 0]) => {
  const todayAtTime = new Date(referenceTime.getFullYear(), referenceTime.getMonth(), referenceTime.getDate(), ...time);
  return alterDaysOnDate(todayAtTime, DUE_DAYS_LOCATION_CONTRACTING);
};

export const getDueDateForExpectDataDelivery = (referenceTime: Date = new Date(), time: Time = [12, 0, 0]) => {
  const todayAtTime = new Date(referenceTime.getFullYear(), referenceTime.getMonth(), referenceTime.getDate(), ...time);
  return alterDaysOnDate(todayAtTime, DUE_DAYS_EXPECT_DATA_DELIVERY);
};

export const getDueDateForDataResearch = (proposal: Proposal, time: Time = [12, 0, 0]) => {
  const startTime = proposal.userProject.generalProjectInformation.desiredStartTime ?? proposal.submittedAt;
  const projectDuration = proposal.userProject.generalProjectInformation.projectDuration ?? 12; // Duration is Month
  const startDateAtTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), ...time);
  const daysToAdd = Math.ceil(projectDuration * 30.437);
  return alterDaysOnDate(startDateAtTime, daysToAdd);
};

export const getDueDateForDataCorrupt = (referenceTime: Date = new Date(), time: Time = [12, 0, 0]) => {
  const todayAtTime = new Date(referenceTime.getFullYear(), referenceTime.getMonth(), referenceTime.getDate(), ...time);
  return alterDaysOnDate(todayAtTime, DUE_DAYS_DATA_CORRUPT);
};

export const getDueDateForFinishedProject = (referenceTime: Date = new Date(), time: Time = [12, 0, 0]) => {
  const todayAtTime = new Date(referenceTime.getFullYear(), referenceTime.getMonth(), referenceTime.getDate(), ...time);
  return alterDaysOnDate(todayAtTime, DUE_DAYS_FINISHED_PROJECT);
};

export const setDueDate = (proposal: Proposal, setContracting?: boolean) => {
  proposal.dueDateForStatus = (() => {
    switch (proposal.status) {
      case ProposalStatus.FdpgCheck: {
        proposal.deadlines = {
          ...proposal.deadlines,
          [DueDateEnum.DUE_DAYS_FDPG_CHECK]: proposal.deadlines?.DUE_DAYS_FDPG_CHECK ?? getDueDateForFdpgCheck(),
        };

        return proposal.deadlines.DUE_DAYS_FDPG_CHECK;
      }

      case ProposalStatus.LocationCheck: {
        proposal.deadlines = {
          ...proposal.deadlines,
          [DueDateEnum.DUE_DAYS_LOCATION_CHECK]:
            proposal.deadlines?.DUE_DAYS_LOCATION_CHECK ?? getDueDateForLocationCheck(),
        };

        return proposal.deadlines.DUE_DAYS_LOCATION_CHECK;
      }

      case ProposalStatus.Contracting: {
        // Should be set on Researcher sign
        const dateUntil = (() => {
          if (setContracting) {
            return proposal.deadlines?.DUE_DAYS_LOCATION_CONTRACTING ?? getDueDateForLocationContracting();
          } else {
            return undefined;
          }
        })();

        proposal.deadlines = {
          ...proposal.deadlines,
          [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: dateUntil,
        };

        return proposal.deadlines?.DUE_DAYS_LOCATION_CONTRACTING;
      }

      case ProposalStatus.ExpectDataDelivery: {
        proposal.deadlines = {
          ...proposal.deadlines,
          [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]:
            proposal.deadlines?.DUE_DAYS_EXPECT_DATA_DELIVERY ?? getDueDateForExpectDataDelivery(),
        };
        return proposal.deadlines.DUE_DAYS_EXPECT_DATA_DELIVERY;
      }

      case ProposalStatus.DataResearch:
        return getDueDateForDataResearch(proposal);

      case ProposalStatus.DataCorrupt: {
        proposal.deadlines = {
          ...proposal.deadlines,
          [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: proposal.deadlines?.DUE_DAYS_DATA_CORRUPT ?? getDueDateForDataCorrupt(),
        };
        return proposal.deadlines.DUE_DAYS_DATA_CORRUPT;
      }

      case ProposalStatus.FinishedProject: {
        proposal.deadlines = {
          ...proposal.deadlines,
          [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]:
            proposal.deadlines?.DUE_DAYS_FINISHED_PROJECT ?? getDueDateForFinishedProject(),
        };
        return proposal.deadlines.DUE_DAYS_FINISHED_PROJECT;
      }

      case ProposalStatus.ReadyToArchive:
      case ProposalStatus.Archived:
      case ProposalStatus.Draft:
      case ProposalStatus.Rejected:
      case ProposalStatus.Rework: {
        if (!proposal.deadlines) {
          proposal.deadlines = { ...defaultDueDateValues };
        }
        Object.keys(defaultDueDateValues).forEach((key) => (proposal.deadlines[key] = null));
        (proposal as ProposalDocument).markModified?.('deadlines');
        return undefined;
      }

      default:
        console.error(`Could not determine ProposalStatus for status '${proposal.status}' on '${proposal._id}'`);
        return proposal.dueDateForStatus;
    }
  })();
};

const areDatesEqual = (date1: Date | null, date2: Date | null): boolean => {
  if (date1 === null && date2 === null) return true;
  if (date1 === null || date2 === null) return false;
  return date1.getTime() === date2.getTime();
};

export const getDueDateChangeList = (
  oldDeadlines: Record<DueDateEnum, Date | null>,
  newDeadlines: Record<DueDateEnum, Date | null>,
): Record<DueDateEnum, Date | null> => {
  const changes: Record<DueDateEnum, Date | null> = {} as Record<DueDateEnum, Date | null>;

  Object.keys(newDeadlines).forEach((key) => {
    const enumKey = key as DueDateEnum;
    const oldValue = oldDeadlines[enumKey];
    const newValue = newDeadlines[enumKey];

    if (!areDatesEqual(oldValue, newValue)) {
      changes[enumKey] = newValue;
    }
  });

  return changes;
};
