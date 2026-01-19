import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ScheduleType } from '../../enums/schedule-type.enum';
import { IProposalScheduleEventSet, ProposalScheduleTypes } from '../../types/schedule-event.types';
import { defaultDueDateValues, DueDateEnum } from 'src/modules/proposal/enums/due-date.enum';
import { getEventsFromSet } from '../get-events.util';
import { Participant } from 'src/modules/proposal/schema/sub-schema/participant.schema';

const mockReturnDate = new Date();

const mockDeadlines = Object.keys(defaultDueDateValues).reduce((acc, curr) => {
  const date = new Date(mockReturnDate);
  date.setFullYear(date.getFullYear() + 1);

  acc[curr] = date;
  return acc;
}, {});

describe('getEventUtil', () => {
  jest.mock('src/modules/proposal/utils/due-date.util', () => ({
    getDueDateForFdpgCheck: jest.fn().mockReturnValue(
      (() => {
        const date = new Date(mockReturnDate);
        date.setDate(date.getDate() + 1);
        return date;
      })(),
    ),
    getDueDateForLocationCheck: jest.fn().mockReturnValue(
      (() => {
        const date = new Date(mockReturnDate);
        date.setDate(date.getDate() + 1);
        return date;
      })(),
    ),
    getDueDateForDataResearch: jest.fn().mockReturnValue(
      (() => {
        const date = new Date(mockReturnDate);
        date.setDate(date.getDate() + 1);
        return date;
      })(),
    ),
    alterOnDeadline: jest.fn().mockReturnValue(
      (() => {
        const date = new Date(mockReturnDate);
        date.setDate(date.getDate() + 1);
        return date;
      })(),
    ),
    alterDaysOnDate: jest.fn().mockReturnValue(
      (() => {
        const date = new Date(mockReturnDate);
        date.setDate(date.getDate() + 1);
        return date;
      })(),
    ),
  }));

  const proposal = {
    dueDate: new Date(),
    deadlines: {},
    scheduledEvents: [],
    participants: [],
    userProject: {
      generalProjectInformation: {
        desiredStartTime: mockReturnDate,
      },
    },
  } as any as Proposal;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handle ScheduleTypes without setting deadlines', () => {
    test.each([
      ScheduleType.ReminderFdpgCheck,
      ScheduleType.ReminderLocationCheck1,
      ScheduleType.ReminderLocationCheck2,
      ScheduleType.ReminderLocationCheck3,
      ScheduleType.ReminderResearcherPublications,
    ])('should set due dates correctly for type "%s"', (type: ProposalScheduleTypes) => {
      const eventSet: IProposalScheduleEventSet = {
        proposal: { ...proposal, deadlines: { ...defaultDueDateValues } },
        types: [type],
      };

      const [result] = getEventsFromSet(eventSet);

      expect(result).toBeDefined();
      expect(result.dueAfter).toBeDefined();
      expect(result.dueAfter.getTime()).toBeGreaterThanOrEqual(mockReturnDate.getTime());
    });

    it('should not create a participating summary event for missing participants', () => {
      const type = ScheduleType.ParticipatingResearcherSummary;
      const eventSet: IProposalScheduleEventSet = {
        proposal: { ...proposal, deadlines: { ...defaultDueDateValues }, scheduledEvents: [], participants: [] },
        types: [type],
      };

      const [result] = getEventsFromSet(eventSet);

      expect(result).toBeFalsy();
    });

    it('should not create a participating summary event for already existing scheduled events', () => {
      const type = ScheduleType.ParticipatingResearcherSummary;
      const eventSet: IProposalScheduleEventSet = {
        proposal: {
          ...proposal,
          deadlines: { ...defaultDueDateValues },
          scheduledEvents: [{ type: ScheduleType.ParticipatingResearcherSummary, scheduleId: 'scheduleId' }],
          participants: [{ researcher: { email: 'email' } } as any as Participant],
        },
        types: [type],
      };

      const [result] = getEventsFromSet(eventSet);

      expect(result).toBeFalsy();
    });

    it('should create a participating summary event', () => {
      const type = ScheduleType.ParticipatingResearcherSummary;
      const eventSet: IProposalScheduleEventSet = {
        proposal: {
          ...proposal,
          deadlines: { ...defaultDueDateValues },
          scheduledEvents: [],
          participants: [{ researcher: { email: 'email' } } as any as Participant],
        },
        types: [type],
      };

      const [result] = getEventsFromSet(eventSet);

      expect(result).toBeDefined();
      expect(result.dueAfter).toBeDefined();
      expect(result.dueAfter.getTime()).toBeGreaterThanOrEqual(mockReturnDate.getTime());
    });

    test.each([
      ScheduleType.ReminderFdpgCheck,
      ScheduleType.ReminderLocationCheck1,
      ScheduleType.ReminderLocationCheck2,
      ScheduleType.ReminderLocationCheck3,
    ])('should set due dates correctly using the deadlines for type "%s"', (type: ProposalScheduleTypes) => {
      Object.keys(defaultDueDateValues);
      const eventSet: IProposalScheduleEventSet = {
        proposal: { ...proposal, deadlines: { ...mockDeadlines } as any as Record<DueDateEnum, Date> },
        types: [type],
      };
      const [result] = getEventsFromSet(eventSet);

      expect(result).toBeDefined();
      expect(result.dueAfter).toBeDefined();
      expect(result.dueAfter.getTime()).toBeGreaterThanOrEqual(mockReturnDate.getTime());
    });
  });
});
