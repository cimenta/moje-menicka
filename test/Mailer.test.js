const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSummaryEmailBody_, buildFetchFailureAlertBody_ } = require('../src/Mailer.js');

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

test('buildSummaryEmailBody_ escapes HTML in restaurant and item names', () => {
  const entries = [{
    restaurantName: '<script>alert(1)</script>',
    date: '2026-08-10',
    items: [{ type: 'jidlo', order: 1, name: 'A & B <tag>', price: null }]
  }];
  const html = buildSummaryEmailBody_(entries, []);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /A &amp; B &lt;tag&gt;/);
});

test('buildFetchFailureAlertBody_ includes restaurant, count, and error, falling back to URL when Name is blank', () => {
  const html = buildFetchFailureAlertBody_(
    { Name: '', URL: 'https://www.menicka.cz/broken.html' },
    3,
    'Fetch failed with status 500'
  );
  assert.match(html, /https:\/\/www\.menicka\.cz\/broken\.html/);
  assert.match(html, /3 time\(s\)/);
  assert.match(html, /Fetch failed with status 500/);
});

test('buildFetchFailureAlertBody_ escapes HTML in the restaurant name and error message', () => {
  const html = buildFetchFailureAlertBody_(
    { Name: '<b>Evil</b>', URL: 'https://www.menicka.cz/x.html' },
    3,
    '<script>bad</script>'
  );
  assert.doesNotMatch(html, /<b>Evil<\/b>/);
  assert.doesNotMatch(html, /<script>bad<\/script>/);
});
