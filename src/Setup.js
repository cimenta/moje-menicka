function setup() {
  var props = PropertiesService.getScriptProperties();

  if (!props.getProperty('spreadsheetId')) {
    var ss = SpreadsheetApp.create('Menicka - Menu Data');
    props.setProperty('spreadsheetId', ss.getId());
    Object.keys(SHEET_HEADERS).forEach(function (name) {
      getOrCreateSheet_(name);
    });
    var defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
    Logger.log('Created spreadsheet: ' + ss.getUrl());
  }

  if (!props.getProperty('timezone')) {
    props.setProperty('timezone', Session.getScriptTimeZone());
  }

  if (!props.getProperty('publicPageEnabled')) {
    props.setProperty('publicPageEnabled', 'false');
  }

  if (!props.getProperty('weekdayCheckHours')) {
    props.setProperty('weekdayCheckHours', '6,7,8,9');
  }

  if (!props.getProperty('sundayCheckHours')) {
    props.setProperty('sundayCheckHours', '17,19,21,22');
  }

  var hasTrigger = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'checkMenus';
  });
  if (!hasTrigger) {
    ScriptApp.newTrigger('checkMenus').timeBased().everyHours(1).create();
    Logger.log('Created hourly trigger for checkMenus');
  }

  Logger.log('Setup complete. spreadsheetId=' + props.getProperty('spreadsheetId') +
    ' timezone=' + props.getProperty('timezone'));
}
