const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isFavourite } = require('../src/Lib_FavouriteMatcher.js');

test('isFavourite matches case-insensitive substring on include', () => {
  assert.equal(isFavourite('120g Smažený květák, tatarská omáčka', [{ include: 'smažený květák' }]), true);
  assert.equal(isFavourite('SMAŽENÝ KVĚTÁK s hranolky', [{ include: 'smažený květák' }]), true);
});

test('isFavourite returns false when no favourite matches', () => {
  assert.equal(isFavourite('Vepřový guláš', [{ include: 'smažený květák' }, { include: 'čočka na kyselo' }]), false);
});

test('isFavourite returns false for empty or null item name', () => {
  assert.equal(isFavourite('', [{ include: 'smažený květák' }]), false);
  assert.equal(isFavourite(null, [{ include: 'smažený květák' }]), false);
});

test('isFavourite returns false when favourite list is empty', () => {
  assert.equal(isFavourite('Smažený květák', []), false);
});

test('isFavourite excludes a match when the exclude phrase is also present', () => {
  const favourites = [{ include: 'čočka na kyselo', exclude: 'klobása' }];
  assert.equal(isFavourite('Vařená vejce, čočka na kyselo s cibulkou', favourites), true);
  assert.equal(isFavourite('Opékaná klobása, čočka na kyselo', favourites), false);
});

test('isFavourite treats a blank exclude the same as no exclude', () => {
  const favourites = [{ include: 'čočka na kyselo', exclude: '' }];
  assert.equal(isFavourite('Klobása, čočka na kyselo', favourites), true);
});
