export const CATALOG = Object.freeze({
  'infinite-luck': { name: 'Infinite Luck', roast: 'Light', description: 'Infinite Luck. The light roast.' },
  azoth: { name: 'Azoth', roast: 'Dark', description: 'Azoth. The dark roast.' }
});
export const PRICES = Object.freeze({ '12oz': 12, '5lb': 72 });
export const cartKey = item => `${item.roast}:${item.size}`;
const validVariant = item => item && typeof item.roast === 'string' && Object.hasOwn(CATALOG, item.roast) && typeof item.size === 'string' && Object.hasOwn(PRICES, item.size);

export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const normalized = [];
  for (const item of value) {
    if (!validVariant(item) || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
    const found = normalized.find(line => cartKey(line) === cartKey(item));
    if (found) found.quantity = Math.min(20, found.quantity + item.quantity);
    else normalized.push({ roast: item.roast, size: item.size, quantity: Math.min(20, item.quantity) });
  }
  return normalized;
}

export function addItem(cart, item) {
  if (!validVariant(item) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return { ok: false, error: 'Please choose a coffee and bag size.' };
  const copy = normalizeCart(cart);
  const found = copy.find(line => cartKey(line) === cartKey(item));
  if (found && found.quantity + item.quantity > 20) return { ok: false, error: 'You can add up to 20 bags of each size and roast.' };
  if (found) found.quantity += item.quantity;
  else copy.push({ roast: item.roast, size: item.size, quantity: item.quantity });
  return { ok: true, cart: copy };
}

export const cartTotal = cart => cart.reduce((total, item) => total + PRICES[item.size] * item.quantity, 0);
export const cartCount = cart => cart.reduce((total, item) => total + item.quantity, 0);
