import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductVisual } from '../public/product-visuals.js';

test('both roasts resolve to distinct artwork for each physical bag size', () => {
  const variants = [
    ['infinite-luck', '12oz', '/assets/infinite-luck-12oz-mark.webp?v=steam-b-v1', 'Infinite Luck', 'light', '12 oz'],
    ['infinite-luck', '5lb', '/assets/infinite-luck-5lb-mark.webp?v=steam-b-v1', 'Infinite Luck', 'light', '5 lb'],
    ['azoth', '12oz', '/assets/azoth-12oz-mark.webp?v=steam-b-v1', 'Azoth', 'dark', '12 oz'],
    ['azoth', '5lb', '/assets/azoth-5lb-mark.webp?v=steam-b-v1', 'Azoth', 'dark', '5 lb'],
  ];
  const sources = new Set();
  for (const [roast, size, src, name, roastLabel, weight] of variants) {
    const visual = getProductVisual(roast, size);
    assert.equal(visual.src, src);
    assert.equal(visual.size, size);
    assert.equal(visual.label, weight);
    assert.equal(visual.alt, `Nectar ${name} ${roastLabel} roast, ${weight} bag packaging concept`);
    sources.add(visual.src);
  }
  assert.equal(sources.size, 4);
});

test('unknown products, sizes, prototype names and markup cannot become image paths or descriptions', () => {
  const invalidVariants = [
    ['unknown', '12oz'], ['__proto__', '12oz'], ['constructor', '12oz'],
    ['infinite-luck', '1lb'], ['azoth', '__proto__'], ['azoth', '12 oz'],
    ['../private', '12oz'], ['azoth', '5lb" onerror="alert(1)'],
    ['<script>', '12oz'], [null, '12oz'], ['azoth', undefined],
    [{ toString: () => 'azoth' }, '12oz'], ['azoth', ['5lb']],
  ];
  for (const [roast, size] of invalidVariants) {
    assert.throws(() => getProductVisual(roast, size), RangeError);
  }
});

test('changing one resolved visual cannot alter future product selections', () => {
  const selected = getProductVisual('azoth', '5lb');
  selected.src = '/incorrect.webp';
  selected.label = '12 oz';
  const again = getProductVisual('azoth', '5lb');
  assert.equal(again.src, '/assets/azoth-5lb-mark.webp?v=steam-b-v1');
  assert.equal(again.label, '5 lb');
  assert.equal(getProductVisual('azoth', '12oz').label, '12 oz');
});
