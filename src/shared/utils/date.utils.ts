export const getLocaleDateString = (value?: string | Date, locale: string = 'de-DE') => {
  if (!value) {
    return '';
  }

  const valueAsDate = value instanceof Date ? value : new Date(value);

  return valueAsDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};
