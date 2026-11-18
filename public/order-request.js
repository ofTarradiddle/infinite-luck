import { CATALOG, PRICES, normalizeCart, cartTotal } from './cart.js';

const dollars = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const oneLine = value => String(value || '').replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120);
export const validPurchaseEmail = email => typeof email === 'string' && email.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(email);

export function buildPurchaseRequest(items, details = {}) {
  const cart = normalizeCart(items);
  if (!cart.length) throw new Error('Add a coffee to your bag first.');
  const payment = details.payment === 'Cash transfer' ? 'Cash transfer' : 'Zelle';
  const lines = cart.map(item => `${item.quantity} × ${CATALOG[item.roast].name} (${CATALOG[item.roast].roast.toLowerCase()} roast), ${item.size === '5lb' ? '5 lb' : '12 oz'} — ${dollars(PRICES[item.size] * item.quantity)}`);
  const body = [
    'Hello oF Nectar,', '', 'I’d like to request the following coffee:', '', ...lines, '',
    `Coffee subtotal: ${dollars(cartTotal(cart))} USD (before shipping and any applicable tax)`,
    `Preferred payment method: ${payment}`, '',
    `Name: ${oneLine(details.name) || '[your name]'}`,
    `Delivery city / region: ${oneLine(details.location) || '[your city / region]'}`, '',
    'Please confirm availability, shipping, the final total, and payment instructions before I send payment.', '',
    'Thank you!'
  ].join('\n');
  return { subject: 'oF Nectar Coffee Roasters — purchase request', body, subtotal: cartTotal(cart), items: cart };
}

export function purchaseMailto(email, request) {
  if (!validPurchaseEmail(email)) throw new Error('The purchase email address has not been configured.');
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(request.subject)}&body=${encodeURIComponent(request.body)}`;
}
