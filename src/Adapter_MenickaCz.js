if (typeof module !== 'undefined') {
  var { parseCzechDate } = require('./Lib_DateUtils.js');
}

function stripHtmlTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRestaurantName(html) {
  const match = html.match(/<h1>([\s\S]*?)<\/h1>/);
  return match ? stripHtmlTags(match[1]) : null;
}

function parseRestaurantAddress(html) {
  const match = html.match(/<div class=['"]adresa['"]>([\s\S]*?)<\/div>\s*<div class=['"]oteviracidoba/);
  return match ? stripHtmlTags(match[1]) : null;
}

function parseLunchHours(html) {
  const match = html.match(/<div class=['"]obedovycas['"]>([\s\S]*?)<\/div>/);
  if (!match) return null;
  return stripHtmlTags(match[1]).replace(/^Menu:\s*/, '');
}

function splitDayBlocks(html) {
  const markerRe = /<div class=['"]menicka['"]>/g;
  const indices = [];
  let m;
  while ((m = markerRe.exec(html)) !== null) {
    indices.push(m.index);
  }
  return indices.map(function (start, i) {
    const end = i + 1 < indices.length ? indices[i + 1] : html.length;
    return html.slice(start, end);
  });
}

function parseMenuItem(itemHtml, type) {
  const polozkaMatch = itemHtml.match(/<div class=['"]polozka['"]>([\s\S]*?)<\/div>/);
  const poradiMatch = itemHtml.match(/<span class=['"]poradi['"]>\s*(\d+)\.\s*<\/span>/);
  const cenaMatch = itemHtml.match(/<div class=['"]cena['"]>([^<]*)<\/div>/);
  let name = polozkaMatch ? stripHtmlTags(polozkaMatch[1]) : '';
  if (poradiMatch) {
    name = name.replace(new RegExp('^' + poradiMatch[1] + '\\.\\s*'), '');
  }
  return {
    type: type,
    order: poradiMatch ? Number(poradiMatch[1]) : null,
    name: name,
    price: cenaMatch ? cenaMatch[1].trim() : null
  };
}

function parseDayBlock(blockHtml) {
  const nadpisMatch = blockHtml.match(/<div class=['"]nadpis['"]>([\s\S]*?)<\/div>/);
  if (!nadpisMatch) return null;
  const date = parseCzechDate(stripHtmlTags(nadpisMatch[1]));
  if (!date) return null;
  const items = [];
  const itemRe = /<li class=['"](polevka|jidlo)['"]>([\s\S]*?)<\/li>/g;
  let im;
  while ((im = itemRe.exec(blockHtml)) !== null) {
    items.push(parseMenuItem(im[2], im[1]));
  }
  return { date: date, items: items };
}

function parseDayBlocks(html) {
  return splitDayBlocks(html)
    .map(parseDayBlock)
    .filter(function (day) { return day !== null; });
}

function parseMenickaPage(html) {
  return {
    name: parseRestaurantName(html),
    address: parseRestaurantAddress(html),
    lunchHours: parseLunchHours(html),
    days: parseDayBlocks(html)
  };
}

function fetchWeek(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('Fetch failed with status ' + response.getResponseCode() + ' for ' + url);
  }
  return parseMenickaPage(response.getContentText());
}

if (typeof module !== 'undefined') {
  module.exports = {
    stripHtmlTags, parseRestaurantName, parseRestaurantAddress, parseLunchHours,
    splitDayBlocks, parseMenuItem, parseDayBlock, parseDayBlocks, parseMenickaPage, fetchWeek
  };
}
