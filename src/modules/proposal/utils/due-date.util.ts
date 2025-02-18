import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';

const DUE_DAYS_FDPG_CHECK = 1 * 7;
const DUE_DAYS_DATA_CORRUPT = 1 * 7;
const DUE_DAYS_FINISHED_PROJECT = 1 * 7;

const DUE_DAYS_LOCATION_CHECK = 8 * 7;
const DUE_DAYS_EXPECT_DATA_DELIVERY = 2 * 7;
const DUE_DAYS_LOCATION_CONTRACTING = 4 * 7;

type Time = [hours: number, minutes: number, seconds: number];

export const alterDaysOnDate = (date: Date, days: number) => {
  return days ? new Date(date.setDate(date.getDate() + days)) : date;
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
  switch (proposal.status) {
    case ProposalStatus.FdpgCheck:
      if (proposal.deadlines.DUE_DAYS_FDPG_CHECK) proposal.dueDateForStatus = proposal.deadlines.DUE_DAYS_FDPG_CHECK;
      else proposal.dueDateForStatus = getDueDateForFdpgCheck();
      break;

    case ProposalStatus.LocationCheck:
      if (proposal.deadlines.DUE_DAYS_LOCATION_CHECK)
        proposal.dueDateForStatus = proposal.deadlines.DUE_DAYS_LOCATION_CHECK;
      else proposal.dueDateForStatus = getDueDateForLocationCheck();
      break;

    case ProposalStatus.Contracting:
      // Should be set on Researcher sign
      if (setContracting) {
        if (proposal.deadlines.DUE_DAYS_LOCATION_CONTRACTING)
          proposal.dueDateForStatus = proposal.deadlines.DUE_DAYS_LOCATION_CONTRACTING;
        else proposal.dueDateForStatus = getDueDateForLocationContracting();
      } else {
        proposal.dueDateForStatus = undefined;
      }

      break;

    case ProposalStatus.ExpectDataDelivery:
      if (proposal.deadlines.DUE_DAYS_EXPECT_DATA_DELIVERY)
        proposal.dueDateForStatus = proposal.deadlines.DUE_DAYS_EXPECT_DATA_DELIVERY;
      proposal.dueDateForStatus = getDueDateForExpectDataDelivery();
      break;

    case ProposalStatus.DataResearch:
      proposal.dueDateForStatus = getDueDateForDataResearch(proposal);
      break;

    case ProposalStatus.DataCorrupt:
      if (proposal.deadlines.DUE_DAYS_DATA_CORRUPT)
        proposal.dueDateForStatus = proposal.deadlines.DUE_DAYS_DATA_CORRUPT;
      else proposal.dueDateForStatus = getDueDateForDataCorrupt();
      break;

    case ProposalStatus.FinishedProject:
      if (proposal.deadlines.DUE_DAYS_FINISHED_PROJECT)
        proposal.dueDateForStatus = proposal.deadlines.DUE_DAYS_FINISHED_PROJECT;
      else proposal.dueDateForStatus = getDueDateForFinishedProject();
      break;

    case ProposalStatus.ReadyToArchive:
    case ProposalStatus.Archived:
    case ProposalStatus.Draft:
    case ProposalStatus.Rejected:
    case ProposalStatus.Rework:
      proposal.dueDateForStatus = undefined;
      break;
    default:
      break;
  }
};
