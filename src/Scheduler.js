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

function processRestaurants_(localToday, weekOffset, timezone, now) {
  var targetDates = getWeekdayIsoDates(localToday, weekOffset);
  var restaurants = getActiveRestaurants();
  var newEntries = [];

  restaurants.forEach(function (restaurant) {
    var existingDates = getExistingMenuDates(restaurant.URL);
    var missingDates = targetDates.filter(function (date) { return !existingDates[date]; });
    var needsMetaBackfill = !restaurant.Name;
    if (missingDates.length === 0 && !needsMetaBackfill) {
      return;
    }
    try {
      var result = fetchWeek(restaurant.URL);
      if (result.name) {
        updateRestaurantMeta(restaurant._rowIndex, {
          name: result.name,
          address: result.address,
          lunchHours: result.lunchHours
        });
      }
      if (result.days.length === 0) {
        logMessage(restaurant.URL, 'Fetched OK but found zero day blocks — menicka.cz markup may have changed');
        return;
      }
      result.days.forEach(function (day) {
        if (missingDates.indexOf(day.date) === -1) return;
        if (day.items.length === 0) return;
        appendMenuDay(restaurant.URL, day);
        newEntries.push({ restaurantName: result.name || restaurant.URL, date: day.date, items: day.items });
      });
    } catch (e) {
      logMessage(restaurant.URL, 'Fetch failed: ' + e.message);
    }
  });

  if (newEntries.length > 0) {
    sendSummaryEmail(newEntries);
  }

  var cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - 60);
  pruneOldMenuData(Utilities.formatDate(cutoff, timezone, 'yyyy-MM-dd'));

  return newEntries.length;
}
