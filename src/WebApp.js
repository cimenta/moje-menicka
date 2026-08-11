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
  if (!publicEnabled) {
    return renderTemplate_('NotAvailable');
  }
  return renderTemplate_('Public');
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
      publicPageEnabled: props.getProperty('publicPageEnabled') === 'true'
    }
  };
}

function addRestaurant(url) {
  assertAdminDeployment_();
  addRestaurantRow(url);
  return getAllRestaurants();
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
}

function triggerManualCheck() {
  assertAdminDeployment_();
  return runManualCheck(0);
}