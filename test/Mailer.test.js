const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSummaryEmailBody_, buildFetchFailureAlertBody_, buildDayMenuHtml_ } = require('../src/Mailer.js');

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

test('buildDayMenuHtml_ includes date, restaurant name, address/lunch-hours line, and highlights favourites', () => {
  const restaurants = [{
    name: 'Pohoštění u Šroubka',
    address: 'Nová 12, Praha',
    lunchHours: '11:00–14:00',
    items: [
      { order: 1, name: 'Smažený květák, tatarská omáčka', price: '139 Kč', favourite: true },
      { order: 2, name: 'Vepřový guláš', price: '155 Kč', favourite: false }
    ]
  }];
  const html = buildDayMenuHtml_('2026-08-14', restaurants);
  assert.match(html, /<h2>2026-08-14<\/h2>/);
  assert.match(html, /<h3>Pohoštění u Šroubka<\/h3>/);
  assert.match(html, /Nová 12, Praha • 11:00–14:00/);
  assert.match(html, /<strong[^>]*>1\. Smažený květák, tatarská omáčka — 139 Kč<\/strong>/);
  assert.match(html, /<li>2\. Vepřový guláš — 155 Kč<\/li>/);
});

test('buildDayMenuHtml_ omits the price separator when price is null and the meta line when address/lunchHours are blank', () => {
  const restaurants = [{
    name: 'Test',
    address: '',
    lunchHours: '',
    items: [{ order: 8, name: 'Zeleninové saláty', price: null, favourite: false }]
  }];
  const html = buildDayMenuHtml_('2026-08-14', restaurants);
  assert.match(html, /<li>8\. Zeleninové saláty<\/li>/);
  assert.doesNotMatch(html, /<p><\/p>/);
});

test('buildDayMenuHtml_ escapes HTML in restaurant and item names', () => {
  const restaurants = [{
    name: '<script>alert(1)</script>',
    address: '',
    lunchHours: '',
    items: [{ order: 1, name: 'A & B <tag>', price: null, favourite: false }]
  }];
  const html = buildDayMenuHtml_('2026-08-14', restaurants);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /A &amp; B &lt;tag&gt;/);
});

test('buildDayMenuHtml_ shows a message when there are no restaurants for the day', () => {
  const html = buildDayMenuHtml_('2026-08-15', []);
  assert.match(html, /<h2>2026-08-15<\/h2>/);
  assert.match(html, /No menu data for this day\./);
});

test('buildDayMenuHtml_ omits the order prefix when item.order is null', () => {
  const restaurants = [{
    name: 'Test',
    address: '',
    lunchHours: '',
    items: [{ order: null, name: 'Polévka dne', price: null, favourite: false }]
  }];
  const html = buildDayMenuHtml_('2026-08-14', restaurants);
  assert.match(html, /<li>Polévka dne<\/li>/);
});

test('buildDayMenuHtml_ renders a separate section per restaurant, in order', () => {
  const restaurants = [
    { name: 'Restaurant A', address: '', lunchHours: '', items: [{ order: 1, name: 'Soup A', price: null, favourite: false }] },
    { name: 'Restaurant B', address: '', lunchHours: '', items: [{ order: 1, name: 'Soup B', price: null, favourite: false }] }
  ];
  const html = buildDayMenuHtml_('2026-08-14', restaurants);
  const firstIndex = html.indexOf('<h3>Restaurant A</h3>');
  const secondIndex = html.indexOf('<h3>Restaurant B</h3>');
  assert.ok(firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex);
});
