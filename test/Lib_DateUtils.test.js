const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCzechDate, isConfiguredCheckHour, isoDateToLocalDate, getWeekdayIsoDates
} = require('../src/Lib_DateUtils.js');

test('parseCzechDate extracts D.M.YYYY into ISO format', () => {
  assert.equal(parseCzechDate('Pondělí 10.8.2026'), '2026-08-10');
  assert.equal(parseCzechDate('Sobota 5.1.2027'), '2027-01-05');
});

test('parseCzechDate returns null when no date is present', () => {
  assert.equal(parseCzechDate('no date here'), null);
});

test('isConfiguredCheckHour matches weekday morning hours to this-week', () => {
  assert.equal(isConfiguredCheckHour(1, 6), 'this-week');
  assert.equal(isConfiguredCheckHour(5, 9), 'this-week');
});

test('isConfiguredCheckHour matches Sunday evening hours to next-week', () => {
  assert.equal(isConfiguredCheckHour(0, 17), 'next-week');
  assert.equal(isConfiguredCheckHour(0, 22), 'next-week');
});

test('isConfiguredCheckHour returns null outside configured hours', () => {
  assert.equal(isConfiguredCheckHour(1, 12), null);
  assert.equal(isConfiguredCheckHour(6, 8), null);
  assert.equal(isConfiguredCheckHour(0, 9), null);
});

test('isoDateToLocalDate produces the correct weekday for a known date', () => {
  assert.equal(isoDateToLocalDate('2026-08-10').getDay(), 1); // Monday
  assert.equal(isoDateToLocalDate('2026-08-16').getDay(), 0); // Sunday
});

test('getWeekdayIsoDates returns Mon-Fri ISO dates for the reference week', () => {
  const dates = getWeekdayIsoDates(isoDateToLocalDate('2026-08-10'), 0);
  assert.deepEqual(dates, ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);
});

test('getWeekdayIsoDates supports next-week offset from any weekday', () => {
  const dates = getWeekdayIsoDates(isoDateToLocalDate('2026-08-16'), 1);
  assert.deepEqual(dates, ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21']);
});
