if (typeof module !== 'undefined') {
  var { isFavourite } = require('./Lib_FavouriteMatcher.js');
}

function buildSummaryEmailBody_(entries, favouriteFoods) {
  var html = '<html><body>';
  entries.forEach(function (entry) {
    html += '<h2>' + entry.restaurantName + '</h2>';
    html += '<h3>' + entry.date + '</h3>';
    html += '<ul>';
    entry.items.forEach(function (item) {
      var label = item.name + (item.price ? ' — ' + item.price : '');
      html += isFavourite(item.name, favouriteFoods)
        ? '<li><strong style="background-color:#fff3a0">' + label + '</strong></li>'
        : '<li>' + label + '</li>';
    });
    html += '</ul>';
  });
  html += '</body></html>';
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

if (typeof module !== 'undefined') {
  module.exports = { buildSummaryEmailBody_ };
}
