function checkMenus() {
  var props = PropertiesService.getScriptProperties();
  var timezone = props.getProperty('timezone') || Session.getScriptTimeZone();
  var now = new Date();
  var todayIso = Utilities.formatDate(now, timezone, 'yyyy-MM-dd');
  var localToday = isoDateToLocalDate(todayIso);
  var weekday = localToday.getDay();
  var hour = Number(Utilities.formatDate(now, timezone, 'H'));

  var weekdayHoursProp = props.getProperty('weekdayCheckHours');
  var sundayHoursProp = props.getProperty('sundayCheckHours');
  var weekdayHours = weekdayHoursProp === null ? undefined : parseHourList(weekdayHoursProp);
  var sundayHours = sundayHoursProp === null ? undefined : parseHourList(sundayHoursProp);
  var window = isConfiguredCheckHour(weekday, hour, weekdayHours, sundayHours);
  if (!window) {
    return;
  }

  var weekOffset = window === 'next-week' ? 1 : 0;
  processRestaurants_(localToday, weekOffset, timezone, now);
}

/**
 * Manual entry point for on-demand testing from the Apps Script editor's
 * function dropdown. Skips the checkMenus() schedule gate. weekOffset
 * defaults to 0 (this week's Mon-Fri); pass 1 to force next week's window.
 */
function runManualCheck(weekOffset) {
  assertAdminDeployment_();
  var props = PropertiesService.getScriptProperties();
  var timezone = props.getProperty('timezone') || Session.getScriptTimeZone();
  var now = new Date();
  var todayIso = Utilities.formatDate(now, timezone, 'yyyy-MM-dd');
  var localToday = isoDateToLocalDate(todayIso);
  var newEntryCount = processRestaurants_(localToday, weekOffset || 0, timezone, now);
  Logger.log('New entries: ' + newEntryCount);
  return newEntryCount;
}

function getMaxFetchFailures_() {
  var raw = PropertiesService.getScriptProperties().getProperty('maxFetchFailures');
  var n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : 3;
}

function fetchRestaurantMenu_(restaurant, targetDates) {
  var existingDates = getExistingMenuDates(restaurant.URL);
  var missingDates = targetDates.filter(function (date) { return !existingDates[date]; });
  var needsMetaBackfill = !restaurant.Name;
  if (missingDates.length === 0 && !needsMetaBackfill) {
    return { newEntries: [] };
  }
  try {
    var result = fetchWeek(restaurant.URL);
    if (restaurant.FailureCount) {
      resetRestaurantFailureCount_(restaurant._rowIndex);
    }
    if (result.name) {
      updateRestaurantMeta(restaurant._rowIndex, {
        name: result.name,
        address: result.address,
        lunchHours: result.lunchHours
      });
    }
    if (result.days.length === 0) {
      logMessage(restaurant.URL, 'Fetched OK but found zero day blocks — menicka.cz markup may have changed');
      return { newEntries: [] };
    }
    var newEntries = [];
    result.days.forEach(function (day) {
      if (missingDates.indexOf(day.date) === -1) return;
      if (day.items.length === 0) return;
      appendMenuDay(restaurant.URL, day);
      newEntries.push({ restaurantName: result.name || restaurant.URL, date: day.date, items: day.items });
    });
    return { newEntries: newEntries };
  } catch (e) {
    logMessage(restaurant.URL, 'Fetch failed: ' + e.message);
    var failureCount = recordRestaurantFailure_(restaurant._rowIndex, restaurant.FailureCount);
    var maxFailures = getMaxFetchFailures_();
    if (failureCount >= maxFailures) {
      deactivateRestaurantRow_(restaurant._rowIndex);
      sendFetchFailureAlert_(restaurant, failureCount, e.message);
    }
    return { newEntries: [], error: e.message };
  }
}

function processRestaurants_(localToday, weekOffset, timezone, now) {
  var targetDates = getWeekdayIsoDates(localToday, weekOffset);
  var restaurants = getActiveRestaurants();
  var newEntries = [];

  restaurants.forEach(function (restaurant) {
    var result = fetchRestaurantMenu_(restaurant, targetDates);
    newEntries = newEntries.concat(result.newEntries);
  });

  if (newEntries.length > 0) {
    sendSummaryEmail(newEntries);
  }

  var cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - 60);
  pruneOldMenuData(Utilities.formatDate(cutoff, timezone, 'yyyy-MM-dd'));

  return newEntries.length;
}

/**
 * Fetches menu data for a single restaurant immediately, used right after
 * it's added via the admin UI so its menu shows up without waiting for the
 * next scheduled check. Sends the summary email if it finds new entries,
 * same as a scheduled check would.
 */
function fetchNewRestaurant_(restaurant) {
  var props = PropertiesService.getScriptProperties();
  var timezone = props.getProperty('timezone') || Session.getScriptTimeZone();
  var todayIso = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
  var localToday = isoDateToLocalDate(todayIso);
  var targetDates = getWeekdayIsoDates(localToday, 0);

  var result = fetchRestaurantMenu_(restaurant, targetDates);
  if (result.newEntries.length > 0) {
    sendSummaryEmail(result.newEntries);
  }
  return result.error || null;
}
