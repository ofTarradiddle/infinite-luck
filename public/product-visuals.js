import { CATALOG } from './cart.js';

const BAG_LABELS = Object.freeze({ '12oz': '12 oz', '5lb': '5 lb' });

/** Resolve only known product variants to their matching packaging artwork. */
export function getProductVisual(roast, size) {
  if (typeof roast !== 'string' || !Object.hasOwn(CATALOG, roast) ||
      typeof size !== 'string' || !Object.hasOwn(BAG_LABELS, size)) {
    throw new RangeError('Choose a known coffee and bag size.');
  }
  const product = CATALOG[roast];
  const label = BAG_LABELS[size];
  return {
    src: `/assets/${roast}-${size}-mark.webp`,
    alt: `Nectar ${product.name} ${product.roast.toLowerCase()} roast, ${label} bag packaging concept`,
    size,
    label,
  };
}
