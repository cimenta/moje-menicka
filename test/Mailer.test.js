const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSummaryEmailBody_ } = require('../src/Mailer.js');

test('buildSummaryEmailBody_ highlights favourite items and includes price', () => {
  const entries = [{
    restaurantName: 'Pohoštění u Šroubka',
    date: '2026-08-10',
    items: [
      { type: 'jidlo', order: 1, name: 'Smažený květák, tatarská omáčka', price: '139 Kč' },
      { type: 'jidlo', order: 2, name: 'Vepřový guláš', price: '155 Kč' }
    ]
  }];
  const html = buildSummaryEmailBody_(entries, [{ include: 'smažený květák' }]);
  assert.match(html, /Pohoštění u Šroubka/);
  assert.match(html, /<strong[^>]*>Smažený květák, tatarská omáčka — 139 Kč<\/strong>/);
  assert.match(html, /<li>Vepřový guláš — 155 Kč<\/li>/);
});

test('buildSummaryEmailBody_ omits the price separator when price is null', () => {
  const entries = [{
    restaurantName: 'Test',
    date: '2026-08-10',
    items: [{ type: 'jidlo', order: 8, name: 'Zeleninové saláty', price: null }]
  }];
  const html = buildSummaryEmailBody_(entries, []);
  assert.match(html, /<li>Zeleninové saláty<\/li>/);
});
