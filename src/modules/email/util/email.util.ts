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
