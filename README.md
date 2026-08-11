# Menicka

A Google Apps Script app that scrapes daily lunch menus from [menicka.cz](https://www.menicka.cz) for a list of restaurants you configure, stores them in a Google Sheet, and emails you a daily summary with your favourite dishes highlighted. Includes an admin web UI for managing everything, and an optional public-facing menu viewer you can share.

## Features

- **Automatic scraping** — an hourly trigger fetches this week's menu on weekday mornings and next week's menu on Sunday evening, only for dates it doesn't already have.
- **Favourite dish highlighting** — mark a phrase as a favourite (e.g. "čočka na kyselo") and matching dishes are highlighted in the daily email and the web UI. Each favourite can also have an exclude phrase (e.g. include "čočka na kyselo" but exclude "klobása") for cases where a simple substring match is too broad.
- **Daily email summary** — sent only when new menu data was actually fetched, listing each restaurant's dishes for the day with favourites highlighted.
- **Admin web UI** — manage restaurants (add/edit/remove/toggle active) and favourite foods (add/edit/remove), view the same day-by-day menu view as the public page, trigger an on-demand check, and toggle the public page on/off.
- **Public web UI** (optional) — a read-only day-by-day menu viewer, gated behind a Script Property so it's off by default.
- **Instant day navigation** — the web UI loads all currently-available days once and switches between them client-side, so Prev/Next has no network round-trip.

## Project layout

```
src/
  Adapter_MenickaCz.js   menicka.cz HTML parsing (restaurant name/address/hours, day blocks, items)
  Lib_DateUtils.js       date/schedule pure logic (check-hour windows, weekday date ranges)
  Lib_FavouriteMatcher.js  include/exclude substring matching for favourite dishes
  Lib_Storage.js         Google Sheets read/write layer (Restaurants, FavouriteFoods, MenuData, Logs)
  Scheduler.js           orchestrates a check run: fetch missing dates, email, prune old data
  Mailer.js              builds and sends the daily summary email
  Setup.js               one-time bootstrap (creates the spreadsheet, sets defaults, installs the trigger)
  WebApp.js              doGet routing (admin vs public deployment) and all client-callable RPC endpoints
  Admin.html             admin UI (Menus tab + Settings tab with Restaurants/Favourite Foods/Settings)
  Public.html             public-facing menu viewer
  DayView.html            shared day-view widget used by both Admin and Public
  NotAvailable.html       shown on the public deployment when the public page is toggled off
  Styles.html             shared CSS
  Version.js              generated from the root VERSION file - do not edit by hand
```

## Setup

1. **Clone and push with [clasp](https://github.com/google/clasp):**
   ```
   clasp create --type webapp --title "Menicka" --rootDir src
   clasp push
   ```
2. **Run `setup()` once** from the Apps Script editor. This creates a "Menicka - Menu Data" spreadsheet, sets default Script Properties, and installs an hourly trigger for `checkMenus`.
3. **Add restaurants and favourite foods** either directly in the spreadsheet or via the Admin UI once deployed.
4. **Deploy two web app deployments** from the Apps Script editor (Deploy → New deployment → Web app):
   - **Admin** — access: **Only myself**.
   - **Public** — access: **Anyone**.

   After creating the Admin deployment, copy its `/exec` URL and set it as the `adminDeploymentUrl` Script Property (Project Settings → Script Properties). This is how `doGet` and the RPC endpoints in `WebApp.js` tell the two deployments apart.
5. **Toggle `publicPageEnabled`** (Script Property, or via the Admin UI's Settings tab) to `true` when you want the public deployment to actually serve menu data.

## Configuration reference (Script Properties)

| Property | Purpose | Default |
|---|---|---|
| `spreadsheetId` | The backing Google Sheet | set by `setup()` |
| `timezone` | Timezone used for date calculations | script's default timezone |
| `publicPageEnabled` | Whether the public deployment serves real data | `false` |
| `adminDeploymentUrl` | The Admin deployment's `/exec` URL — required for admin routing and RPC authorization to work | unset |

## Security model

Google's per-deployment access control ("Only myself" vs "Anyone") gates which page `doGet` renders, but Apps Script's `google.script.run` can call any top-level server function by name regardless of deployment. Every admin-only function (in `WebApp.js` and `Lib_Storage.js`) therefore starts with `assertAdminDeployment_()`, which independently checks that the request actually came in through the URL recorded in `adminDeploymentUrl`. **If you recreate the Admin deployment, you must update the `adminDeploymentUrl` Script Property to match, or the guard will reject even you.**

## Testing

`test/` covers the pure-logic modules (`Lib_DateUtils.js`, `Lib_FavouriteMatcher.js`, `Adapter_MenickaCz.js`, `Mailer.js`) with Node's built-in test runner:

```
node --test test/*.test.js
```

The Google Sheets/Apps Script-service code (`Lib_Storage.js`, `WebApp.js`, `Scheduler.js`, `Setup.js`) isn't covered by these tests since it depends on live Apps Script services — it's verified manually against a real deployment instead.

## License

MIT — see [LICENSE](LICENSE).
