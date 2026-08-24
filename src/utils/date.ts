export const formatLocalDate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getAdjacentDate = (date: string, days: number): string => {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return formatLocalDate(result);
};
