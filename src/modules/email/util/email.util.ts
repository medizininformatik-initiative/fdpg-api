export const getEmailReminderText = (type: 0 | 1 | 2): string => {
  switch (type) {
    case 0:
      return 'in 3 Wochen';
    case 1:
      return 'in 1 Woche';
    case 2:
      return 'morgen';
  }
};

export const getEmailReminderFinishedProjectDueDaysText = (type: 0 | 1): string => {
  switch (type) {
    case 0:
      return 'in 2 Monaten';
    case 1:
      return 'morgen';
  }
};
