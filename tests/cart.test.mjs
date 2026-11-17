import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, PRICES, normalizeCart, addItem, cartTotal, cartCount, cartKey } from '../public/cart.js';

const line = (roast = 'infinite-luck', size = '12oz', quantity = 1) => ({ roast, size, quantity });

test('catalog, all four variants, and prices match the launch offer', () => {
  assert.equal(CATALOG['infinite-luck'].roast, 'Light');
  assert.equal(CATALOG.azoth.roast, 'Dark');
  assert.deepEqual(PRICES, { '12oz': 12, '5lb': 72 });
  const cart = normalizeCart([
    line('infinite-luck', '12oz'), line('infinite-luck', '5lb'),
    line('azoth', '12oz'), line('azoth', '5lb'),
  ]);
  assert.equal(cart.length, 4);
  assert.equal(new Set(cart.map(cartKey)).size, 4);
  assert.equal(cartTotal(cart), 168);
  assert.equal(cartCount(cart), 4);
});

test('mixed roast, size, and quantity totals are calculated correctly', () => {
  const cart = [line('infinite-luck', '12oz', 3), line('azoth', '5lb', 2)];
  assert.equal(cartTotal(cart), 180);
  assert.equal(cartCount(cart), 5);
  assert.equal(cartTotal([]), 0);
  assert.equal(cartCount([]), 0);
});

test('saved cart normalization rejects invalid data and consolidates duplicates', () => {
  for (const invalid of [null, undefined, {}, '[]', 123]) assert.deepEqual(normalizeCart(invalid), []);
  const saved = [
    null, {}, 'azoth',
    line('unknown'), line('__proto__'), line('constructor'),
    line('azoth', '__proto__'), line('azoth', '1lb'),
    line('azoth', '12oz', '2'), line('azoth', '12oz', 1.5),
    line('azoth', '12oz', 0), line('azoth', '12oz', -1),
    line('infinite-luck', '12oz', 2), line('infinite-luck', '12oz', 3),
    { ...line('azoth', '5lb', 1), price: 0.01, unexpected: '<script>' },
  ];
  const snapshot = JSON.stringify(saved);
  assert.deepEqual(normalizeCart(saved), [line('infinite-luck', '12oz', 5), line('azoth', '5lb', 1)]);
  assert.equal(JSON.stringify(saved), snapshot);
});

test('normalization caps each saved variant at 20 bags independently', () => {
  const cart = normalizeCart([
    line('infinite-luck', '12oz', 16), line('infinite-luck', '12oz', 9),
    line('azoth', '5lb', 999), line('azoth', '12oz', 2),
  ]);
  assert.deepEqual(cart, [line('infinite-luck', '12oz', 20), line('azoth', '5lb', 20), line('azoth', '12oz', 2)]);
});

test('adding merges a variant without mutating the existing cart', () => {
  const original = [line('azoth', '12oz', 2)];
  const result = addItem(original, line('azoth', '12oz', 3));
  assert.equal(result.ok, true);
  assert.deepEqual(result.cart, [line('azoth', '12oz', 5)]);
  assert.deepEqual(original, [line('azoth', '12oz', 2)]);
  assert.notEqual(result.cart[0], original[0]);
});

test('adding enforces the 20-bag limit without silently discarding overflow', () => {
  const cart = [line('azoth', '5lb', 19)];
  const full = addItem(cart, line('azoth', '5lb', 1));
  assert.equal(full.ok, true);
  assert.equal(full.cart[0].quantity, 20);
  assert.equal(addItem(full.cart, line('azoth', '5lb')).ok, false);
  assert.equal(addItem(full.cart, line('azoth', '12oz')).ok, true);
  for (const bad of [line('bad'), line('azoth', '12oz', 21), line('azoth', '12oz', 0), line('azoth', '12oz', 1.1)]) {
    assert.equal(addItem(cart, bad).ok, false);
  }
  assert.deepEqual(cart, [line('azoth', '5lb', 19)]);
});
