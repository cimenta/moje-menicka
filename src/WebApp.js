function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function renderTemplate_(name) {
  var template = HtmlService.createTemplateFromFile(name);
  template.APP_VERSION = APP_VERSION;
  return template.evaluate()
    .setTitle('Menicka')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function isAdminDeployment_() {
  var adminUrl = PropertiesService.getScriptProperties().getProperty('adminDeploymentUrl');
  return !!adminUrl && ScriptApp.getService().getUrl() === adminUrl;
}

function assertAdminDeployment_() {
  if (!isAdminDeployment_()) {
    throw new Error('Not authorized.');
  }
}

function doGet(e) {
  if (isAdminDeployment_()) {
    return renderTemplate_('Admin');
  }
  var publicEnabled = PropertiesService.getScriptProperties().getProperty('publicPageEnabled') === 'true';
  if (e && e.parameter && e.parameter.format === 'json') {
    return handleJsonApi_(e.parameter, publicEnabled);
  }
  if (e && e.parameter && e.parameter.format === 'html') {
    return handleHtmlApi_(e.parameter, publicEnabled);
  }
  if (!publicEnabled) {
    return renderTemplate_('NotAvailable');
  }
  return renderTemplate_('Public');
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function handleJsonApi_(params, publicEnabled) {
  if (!publicEnabled) {
    return jsonOutput_({ error: 'Not available.' });
  }
  if (params.range === 'today') {
    return jsonOutput_(getTodayMenuData_());
  }
  if (params.range === 'week') {
    return jsonOutput_(getWeekMenuData_());
  }
  return jsonOutput_({ error: 'Invalid or missing range parameter. Use range=today or range=week.' });
}

function getTodayIso_() {
  var props = PropertiesService.getScriptProperties();
  var timezone = props.getProperty('timezone') || Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
}

function getTodayMenuData_() {
  var todayIso = getTodayIso_();
  return { date: todayIso, restaurants: getMenuForDate(todayIso) };
}

function getWeekMenuData_() {
  var todayIso = getTodayIso_();
  var weekdayDates = getWeekdayIsoDates(isoDateToLocalDate(todayIso), 0);
  return {
    days: weekdayDates.map(function (isoDate) {
      return { date: isoDate, restaurants: getMenuForDate(isoDate) };
    })
  };
}

function htmlOutput_(html) {
  return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
}

function handleHtmlApi_(params, publicEnabled) {
  if (!publicEnabled) {
    return htmlOutput_('<html><body><p>Not available.</p></body></html>');
  }
  if (params.range === 'today') {
    return htmlOutput_(buildTodayMenuHtml_());
  }
  if (params.range === 'week') {
    return htmlOutput_(buildWeekMenuHtml_());
  }
  return htmlOutput_('<html><body><p>Invalid or missing range parameter. Use range=today or range=week.</p></body></html>');
}

function buildTodayMenuHtml_() {
  var data = getTodayMenuData_();
  return '<html><head><meta charset="utf-8"></head><body>' +
    buildDayMenuHtml_(data.date, data.restaurants) +
    '</body></html>';
}

function buildWeekMenuHtml_() {
  var data = getWeekMenuData_();
  var body = data.days.map(function (day) {
    return buildDayMenuHtml_(day.date, day.restaurants);
  }).join('');
  return '<html><head><meta charset="utf-8"></head><body>' + body + '</body></html>';
}

function getAllDayData() {
  var dates = getDistinctMenuDates();
  var byDate = {};
  dates.forEach(function (date) {
    byDate[date] = getMenuForDate(date);
  });
  return { dates: dates, byDate: byDate };
}

function getAdminData() {
  assertAdminDeployment_();
  var props = PropertiesService.getScriptProperties();
  return {
    restaurants: getAllRestaurants(),
    favouriteFoods: getAllFavouriteFoodRows(),
    settings: {
      timezone: props.getProperty('timezone') || Session.getScriptTimeZone(),
      publicPageEnabled: props.getProperty('publicPageEnabled') === 'true',
      weekdayCheckHours: props.getProperty('weekdayCheckHours') || '6,7,8,9',
      sundayCheckHours: props.getProperty('sundayCheckHours') || '17,19,21,22',
      maxFetchFailures: parseInt(props.getProperty('maxFetchFailures'), 10) || 3
    }
  };
}

function addRestaurant(url) {
  assertAdminDeployment_();
  addRestaurantRow(url);
  var restaurants = getAllRestaurants();
  var newRestaurant = restaurants[restaurants.length - 1];
  var fetchError = fetchNewRestaurant_(newRestaurant);
  return { restaurants: getAllRestaurants(), fetchError: fetchError };
}

function removeRestaurant(rowIndex) {
  assertAdminDeployment_();
  removeRestaurantRow(rowIndex);
  return getAllRestaurants();
}

function setRestaurantActive(rowIndex, active) {
  assertAdminDeployment_();
  setRestaurantActiveFlag(rowIndex, active);
  return getAllRestaurants();
}

function updateRestaurant(rowIndex, fields) {
  assertAdminDeployment_();
  updateRestaurantRow(rowIndex, fields);
  return getAllRestaurants();
}

function addFavouriteFood(include, exclude) {
  assertAdminDeployment_();
  addFavouriteFoodRow(include, exclude);
  return getAllFavouriteFoodRows();
}

function updateFavouriteFood(rowIndex, include, exclude) {
  assertAdminDeployment_();
  updateFavouriteFoodRow(rowIndex, include, exclude);
  return getAllFavouriteFoodRows();
}

function removeFavouriteFood(rowIndex) {
  assertAdminDeployment_();
  removeFavouriteFoodRow(rowIndex);
  return getAllFavouriteFoodRows();
}

function saveSettings(settings) {
  assertAdminDeployment_();
  var props = PropertiesService.getScriptProperties();
  props.setProperty('timezone', settings.timezone);
  props.setProperty('publicPageEnabled', settings.publicPageEnabled ? 'true' : 'false');

  var weekdayHours = (settings.weekdayCheckHours || '').trim();
  if (weekdayHours && parseHourList(weekdayHours).length === 0) {
    throw new Error('Weekday check hours must be a comma-separated list of numbers 0-23.');
  }
  props.setProperty('weekdayCheckHours', weekdayHours);

  var sundayHours = (settings.sundayCheckHours || '').trim();
  if (sundayHours && parseHourList(sundayHours).length === 0) {
    throw new Error('Sunday check hours must be a comma-separated list of numbers 0-23.');
  }
  props.setProperty('sundayCheckHours', sundayHours);

  var maxFailures = parseInt(settings.maxFetchFailures, 10);
  if (!Number.isInteger(maxFailures) || maxFailures < 1) {
    throw new Error('Max fetch failures must be a whole number of 1 or more.');
  }
  props.setProperty('maxFetchFailures', String(maxFailures));
}

function triggerManualCheck() {
  assertAdminDeployment_();
  return runManualCheck(0);
}