const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  parseRestaurantName, parseRestaurantAddress, parseLunchHours, parseDayBlocks, parseMenickaPage
} = require('../src/Adapter_MenickaCz.js');

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'menicka-pohosteni-u-sroubka.html'),
  'utf8'
);

test('parseRestaurantName extracts the name without the favourite-icon markup', () => {
  assert.equal(parseRestaurantName(fixtureHtml), 'Pohoštění u Šroubka');
});

test('parseRestaurantAddress extracts and normalizes the address', () => {
  assert.equal(parseRestaurantAddress(fixtureHtml), 'Táborská, 4356, 615 00, Brno');
});

test('parseLunchHours extracts the obědový čas without the "Menu:" label', () => {
  assert.equal(parseLunchHours(fixtureHtml), '10:30 ‐ 14:15');
});

test('parseDayBlocks finds one block per day with correct ISO dates', () => {
  const days = parseDayBlocks(fixtureHtml);
  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-08-10');
  assert.equal(days[1].date, '2026-08-11');
});

test('parseDayBlocks extracts soup and dish items with order, name, and price', () => {
  const monday = parseDayBlocks(fixtureHtml)[0];
  assert.equal(monday.items.length, 9);
  assert.deepEqual(monday.items[0], {
    type: 'polevka', order: null, name: 'Domácí kulajda – 1,3,7,8,9', price: '29 Kč'
  });
  assert.deepEqual(monday.items[1], {
    type: 'jidlo', order: 1,
    name: '2ks Vařená vejce, čočka na kyselo s osmaženou cibulkou, okurek, chléb – 1,3,8',
    price: '139 Kč'
  });
});

test('parseDayBlocks handles items with no price', () => {
  const monday = parseDayBlocks(fixtureHtml)[0];
  const lastItem = monday.items[monday.items.length - 1];
  assert.equal(lastItem.name, 'Zeleninové saláty a domácí dezerty dle denní nabídky');
  assert.equal(lastItem.price, null);
});

test('parseMenickaPage combines name, address, lunch hours, and days', () => {
  const result = parseMenickaPage(fixtureHtml);
  assert.equal(result.name, 'Pohoštění u Šroubka');
  assert.equal(result.address, 'Táborská, 4356, 615 00, Brno');
  assert.equal(result.lunchHours, '10:30 ‐ 14:15');
  assert.equal(result.days.length, 7);
});
