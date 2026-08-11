var SHEET_NAMES = {
  RESTAURANTS: 'Restaurants',
  FAVOURITES: 'FavouriteFoods',
  MENU_DATA: 'MenuData',
  LOGS: 'Logs'
};

var SHEET_HEADERS = {
  Restaurants: ['URL', 'SourceType', 'Active', 'Name', 'Address', 'LunchHours', 'FailureCount'],
  FavouriteFoods: ['Include', 'Exclude'],
  MenuData: ['RestaurantUrl', 'Date', 'Type', 'Order', 'Name', 'Price', 'FetchedAt'],
  Logs: ['Timestamp', 'RestaurantUrl', 'Message']
};

function getSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty('spreadsheetId');
  if (!id) {
    throw new Error('spreadsheetId not set. Run setup() first.');
  }
  return id;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getSpreadsheetId_());
}

function getOrCreateSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(SHEET_HEADERS[name]);
    if (name === SHEET_NAMES.MENU_DATA) {
      sheet.getRange('B:B').setNumberFormat('@');
    }
  } else if (name === SHEET_NAMES.FAVOURITES && sheet.getLastRow() <= 1) {
    var headers = SHEET_HEADERS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (name === SHEET_NAMES.RESTAURANTS) {
    var expectedHeaders = SHEET_HEADERS[name];
    var currentWidth = sheet.getLastColumn();
    if (currentWidth < expectedHeaders.length) {
      sheet.getRange(1, currentWidth + 1, 1, expectedHeaders.length - currentWidth)
        .setValues([expectedHeaders.slice(currentWidth)]);
    }
  }
  return sheet;
}

function sheetRowsAsObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row, i) {
    var obj = { _rowIndex: i + 2 };
    headers.forEach(function (header, col) {
      obj[header] = row[col];
    });
    return obj;
  });
}

function getActiveRestaurants() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  return sheetRowsAsObjects_(sheet).filter(function (row) {
    return row.Active === true || row.Active === 'TRUE';
  });
}

function updateRestaurantMeta(rowIndex, meta) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  sheet.getRange(rowIndex, 4, 1, 3).setValues([[meta.name, meta.address, meta.lunchHours]]);
}

function getFavouriteFoods() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.FAVOURITES);
  return sheetRowsAsObjects_(sheet)
    .filter(function (row) { return row.Include; })
    .map(function (row) { return { include: row.Include, exclude: row.Exclude || '' }; });
}

function getExistingMenuDates(restaurantUrl) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.MENU_DATA);
  var dates = {};
  sheetRowsAsObjects_(sheet).forEach(function (row) {
    if (row.RestaurantUrl === restaurantUrl) {
      dates[row.Date] = true;
    }
  });
  return dates;
}

function appendMenuDay(restaurantUrl, day) {
  if (day.items.length === 0) return;
  var sheet = getOrCreateSheet_(SHEET_NAMES.MENU_DATA);
  var now = new Date();
  var rows = day.items.map(function (item) {
    return [restaurantUrl, day.date, item.type, item.order, item.name, item.price, now];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function pruneOldMenuData(cutoffIsoDate) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.MENU_DATA);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  var rowsToKeep = [values[0]];
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] >= cutoffIsoDate) {
      rowsToKeep.push(values[i]);
    }
  }
  if (rowsToKeep.length === values.length) {
    return;
  }
  sheet.clearContents();
  sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
}

function logMessage(restaurantUrl, message) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.LOGS);
  sheet.appendRow([new Date(), restaurantUrl, message]);
}

function getAllRestaurants() {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  return sheetRowsAsObjects_(sheet);
}

function addRestaurantRow(url) {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  sheet.appendRow([url, 'menicka.cz', true, '', '', '']);
}

function removeRestaurantRow(rowIndex) {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  sheet.deleteRow(rowIndex);
}

function setRestaurantActiveFlag(rowIndex, active) {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  sheet.getRange(rowIndex, 3).setValue(active);
  if (active) {
    sheet.getRange(rowIndex, 7).setValue(0);
  }
}

function recordRestaurantFailure_(rowIndex, currentCount) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  var newCount = (Number(currentCount) || 0) + 1;
  sheet.getRange(rowIndex, 7).setValue(newCount);
  return newCount;
}

function resetRestaurantFailureCount_(rowIndex) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  sheet.getRange(rowIndex, 7).setValue(0);
}

function deactivateRestaurantRow_(rowIndex) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  sheet.getRange(rowIndex, 3).setValue(false);
}

function updateRestaurantRow(rowIndex, fields) {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.RESTAURANTS);
  sheet.getRange(rowIndex, 1).setValue(fields.url);
  sheet.getRange(rowIndex, 4, 1, 3).setValues([[fields.name, fields.address, fields.lunchHours]]);
}

function getAllFavouriteFoodRows() {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.FAVOURITES);
  return sheetRowsAsObjects_(sheet);
}

function addFavouriteFoodRow(include, exclude) {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.FAVOURITES);
  sheet.appendRow([include, exclude || '']);
}

function updateFavouriteFoodRow(rowIndex, include, exclude) {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.FAVOURITES);
  sheet.getRange(rowIndex, 1, 1, 2).setValues([[include, exclude || '']]);
}

function removeFavouriteFoodRow(rowIndex) {
  assertAdminDeployment_();
  var sheet = getOrCreateSheet_(SHEET_NAMES.FAVOURITES);
  sheet.deleteRow(rowIndex);
}

function isPublicDataAllowed_() {
  return isAdminDeployment_() || PropertiesService.getScriptProperties().getProperty('publicPageEnabled') === 'true';
}

function getDistinctMenuDates() {
  if (!isPublicDataAllowed_()) return [];
  var sheet = getOrCreateSheet_(SHEET_NAMES.MENU_DATA);
  var rows = sheetRowsAsObjects_(sheet);
  var datesSet = {};
  rows.forEach(function (row) { datesSet[row.Date] = true; });
  return Object.keys(datesSet).sort();
}

function getMenuForDate(isoDate) {
  if (!isPublicDataAllowed_()) return [];
  var menuSheet = getOrCreateSheet_(SHEET_NAMES.MENU_DATA);
  var menuRows = sheetRowsAsObjects_(menuSheet).filter(function (row) {
    return row.Date === isoDate;
  });

  var favouriteFoods = getFavouriteFoods();
  var restaurants = getActiveRestaurants();

  return restaurants
    .map(function (restaurant) {
      var items = menuRows
        .filter(function (row) { return row.RestaurantUrl === restaurant.URL; })
        .map(function (row) {
          return {
            type: row.Type,
            order: row.Order || null,
            name: row.Name,
            price: row.Price || null,
            favourite: isFavourite(row.Name, favouriteFoods)
          };
        });
      return {
        url: restaurant.URL,
        name: restaurant.Name || restaurant.URL,
        address: restaurant.Address,
        lunchHours: restaurant.LunchHours,
        items: items
      };
    })
    .filter(function (restaurant) { return restaurant.items.length > 0; });
}
