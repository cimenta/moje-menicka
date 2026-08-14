if (typeof module !== 'undefined') {
  var { isFavourite } = require('./Lib_FavouriteMatcher.js');
}

function escapeHtml_(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSummaryEmailBody_(entries, favouriteFoods) {
  var html = '<html><body>';
  entries.forEach(function (entry) {
    html += '<h2>' + escapeHtml_(entry.restaurantName) + '</h2>';
    html += '<h3>' + escapeHtml_(entry.date) + '</h3>';
    html += '<ul>';
    entry.items.forEach(function (item) {
      var label = escapeHtml_(item.name) + (item.price ? ' — ' + escapeHtml_(item.price) : '');
      html += isFavourite(item.name, favouriteFoods)
        ? '<li><strong style="background-color:#fff3a0">' + label + '</strong></li>'
        : '<li>' + label + '</li>';
    });
    html += '</ul>';
  });
  html += '</body></html>';
  return html;
}

function buildDayMenuHtml_(dateIso, restaurants) {
  var html = '<h2>' + escapeHtml_(dateIso) + '</h2>';
  if (restaurants.length === 0) {
    html += '<p>No menu data for this day.</p>';
    return html;
  }
  restaurants.forEach(function (restaurant) {
    html += '<h3>' + escapeHtml_(restaurant.name) + '</h3>';
    var meta = [restaurant.address, restaurant.lunchHours].filter(Boolean).join(' • ');
    if (meta) {
      html += '<p>' + escapeHtml_(meta) + '</p>';
    }
    html += '<ul>';
    restaurant.items.forEach(function (item) {
      var label = (item.order ? escapeHtml_(item.order) + '. ' : '') + escapeHtml_(item.name) +
        (item.price ? ' — ' + escapeHtml_(item.price) : '');
      html += item.favourite
        ? '<li><strong style="background-color:#fff3a0">' + label + '</strong></li>'
        : '<li>' + label + '</li>';
    });
    html += '</ul>';
  });
  return html;
}

function sendSummaryEmail(entries) {
  if (entries.length === 0) return;
  var favouriteFoods = getFavouriteFoods();
  var body = buildSummaryEmailBody_(entries, favouriteFoods);
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Menicka: new menu(s) fetched',
    htmlBody: body
  });
}

function buildFetchFailureAlertBody_(restaurant, failureCount, errorMessage) {
  var name = restaurant.Name || restaurant.URL;
  return '<html><body>' +
    '<p>The restaurant <strong>' + escapeHtml_(name) + '</strong> (' + escapeHtml_(restaurant.URL) + ') ' +
    'failed to fetch ' + failureCount + ' time(s) in a row and has been deactivated.</p>' +
    '<p>Last error: ' + escapeHtml_(errorMessage) + '</p>' +
    '<p>Fix the issue (or the URL) and re-check "Active" in the Admin UI to retry.</p>' +
    '</body></html>';
}

function sendFetchFailureAlert_(restaurant, failureCount, errorMessage) {
  var body = buildFetchFailureAlertBody_(restaurant, failureCount, errorMessage);
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Menicka: restaurant deactivated after repeated fetch failures',
    htmlBody: body
  });
}

if (typeof module !== 'undefined') {
  module.exports = { buildSummaryEmailBody_, buildFetchFailureAlertBody_, buildDayMenuHtml_ };
}
