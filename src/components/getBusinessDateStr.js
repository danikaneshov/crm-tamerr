export const getBusinessDateStr = (date = new Date()) => {
  const d = new Date(date);
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }
  return d.toLocaleDateString('ru-RU');
};
