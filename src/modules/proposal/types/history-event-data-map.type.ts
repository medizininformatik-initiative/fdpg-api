import { HistoryEventType } from '../enums/history-event.enum';

// Add imports for any types needed for data shapes here

type HistoryEventData = {
  [HistoryEventType.ParticipantAdded]: { participantName: string };
  [HistoryEventType.ParticipantRemoved]: { participantName: string };
};

export type HistoryEventDataMap<T extends HistoryEventType> = T extends keyof HistoryEventData
  ? HistoryEventData[T]
  : undefined;
