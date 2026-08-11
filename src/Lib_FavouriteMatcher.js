function isFavourite(itemName, favouriteFoods) {
  if (!itemName) return false;
  const lowerName = itemName.toLowerCase();
  return favouriteFoods.some(function (food) {
    const include = (food.include || '').toLowerCase();
    if (!include || lowerName.indexOf(include) === -1) return false;
    const exclude = (food.exclude || '').toLowerCase();
    if (exclude && lowerName.indexOf(exclude) !== -1) return false;
    return true;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { isFavourite };
}
