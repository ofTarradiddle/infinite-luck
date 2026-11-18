import { CATALOG, PRICES } from './cart.js';

/** Stable, crawlable product URLs; size queries also work when shared directly. */
export function productPath(roast) {
  if (typeof roast !== 'string' || !Object.hasOwn(CATALOG, roast)) throw new RangeError('Choose a known coffee.');
  return `/coffee/${roast}-${CATALOG[roast].roast.toLowerCase()}-roast/`;
}

export function requestedSize(search) {
  const size = new URLSearchParams(search).get('size');
  return size && Object.hasOwn(PRICES, size) ? size : '12oz';
}
