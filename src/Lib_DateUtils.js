function parseCzechDate(text) {
  const match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function isConfiguredCheckHour(weekday, hour) {
  const WEEKDAY_HOURS = [6, 7, 8, 9];
  const SUNDAY_HOURS = [17, 19, 21, 22];
  if (weekday >= 1 && weekday <= 5 && WEEKDAY_HOURS.indexOf(hour) !== -1) {
    return 'this-week';
  }
  if (weekday === 0 && SUNDAY_HOURS.indexOf(hour) !== -1) {
    return 'next-week';
  }
  return null;
}

function isoDateToLocalDate(isoDateStr) {
  const parts = isoDateStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMondayOfWeek(date, weekOffset) {
  const result = new Date(date.getTime());
  const day = result.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday + weekOffset * 7);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getWeekdayIsoDates(referenceDate, weekOffset) {
  const monday = getMondayOfWeek(referenceDate, weekOffset);
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday.getTime());
    d.setDate(d.getDate() + i);
    dates.push(formatIsoDate(d));
  }
  return dates;
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseCzechDate, isConfiguredCheckHour, isoDateToLocalDate, formatIsoDate,
    getMondayOfWeek, getWeekdayIsoDates
  };
}
