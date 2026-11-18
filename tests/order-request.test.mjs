import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPurchaseRequest, purchaseMailto, validPurchaseEmail } from '../public/order-request.js';

const line = (roast, size, quantity = 1) => ({ roast, size, quantity });

test('purchase request names both coffees and sizes with authoritative line totals and subtotal', () => {
  const request = buildPurchaseRequest([
    line('infinite-luck', '12oz', 2), line('azoth', '5lb', 3),
  ]);
  assert.equal(request.subject, 'Nectar Coffee Roasters — purchase request');
  assert.equal(request.subtotal, 240);
  assert.match(request.body, /2 × Infinite Luck \(light roast\), 12 oz — \$24\.00/);
  assert.match(request.body, /3 × Azoth \(dark roast\), 5 lb — \$216\.00/);
  assert.match(request.body, /Coffee subtotal: \$240\.00 USD \(before shipping and any applicable tax\)/);
  assert.match(request.body, /Please confirm availability, shipping, the final total, and payment instructions before I send payment\./);
  assert.match(request.body, /Name: \[your name\]/);
  assert.match(request.body, /Delivery city \/ region: \[your city \/ region\]/);
});

test('purchase request consolidates duplicate saved lines and ignores invalid saved products', () => {
  const source = [
    line('azoth', '12oz', 2), line('azoth', '12oz', 3),
    line('unknown', '12oz'), line('infinite-luck', '5lb'),
  ];
  const snapshot = structuredClone(source);
  const request = buildPurchaseRequest(source);
  assert.equal(request.subtotal, 132);
  assert.deepEqual(request.items, [line('azoth', '12oz', 5), line('infinite-luck', '5lb')]);
  assert.equal(request.body.match(/× Azoth/g).length, 1);
  assert.doesNotMatch(request.body, /unknown/);
  assert.deepEqual(source, snapshot);
  assert.notEqual(request.items[0], source[0]);
});

test('customer detail fields cannot add extra email lines and are length bounded', () => {
  const request = buildPurchaseRequest([line('azoth', '12oz')], {
    name: '  Ada\r\nBcc: stranger@example.com\u0000  ',
    location: '  Albany\nNY\tUSA\u007f  ',
  });
  assert.match(request.body, /^Name: Ada  Bcc: stranger@example\.com$/m);
  assert.match(request.body, /^Delivery city \/ region: Albany NY USA$/m);
  assert.doesNotMatch(request.body, /^Bcc:/m);
  const long = buildPurchaseRequest([line('azoth', '12oz')], { name: 'x'.repeat(500), location: 'y'.repeat(500) });
  assert.equal(long.body.split('\n').find(value => value.startsWith('Name: ')).slice(6).length, 120);
  assert.equal(long.body.split('\n').find(value => value.startsWith('Delivery city / region: ')).slice(24).length, 120);
});

test('payment preference is explicit, with unsupported values safely defaulting to Zelle', () => {
  const cart = [line('infinite-luck', '5lb')];
  assert.match(buildPurchaseRequest(cart, { payment: 'Cash transfer' }).body, /Preferred payment method: Cash transfer/);
  for (const payment of [undefined, 'Zelle', 'Card', 'Cash transfer\nPaid: true']) {
    const request = buildPurchaseRequest(cart, { payment });
    assert.match(request.body, /Preferred payment method: Zelle/);
    assert.doesNotMatch(request.body, /^Paid: true/m);
  }
});

test('mailto encodes exactly one recipient, subject and full multiline purchase body', () => {
  const recipient = 'orders+coffee@nectar.example';
  const request = buildPurchaseRequest([line('infinite-luck', '12oz'), line('azoth', '5lb')], {
    name: 'A & B? #é', location: 'Albany, NY', payment: 'Cash transfer',
  });
  const href = purchaseMailto(recipient, request);
  const url = new URL(href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(decodeURIComponent(url.pathname), recipient);
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
  assert.equal(url.searchParams.get('subject'), request.subject);
  assert.equal(url.searchParams.get('body'), request.body);
  assert.match(href, /%0A/);
  assert.match(href, /A%20%26%20B%3F%20%23%C3%A9/);
  assert.doesNotMatch(href, /[\r\n]/);
});

test('unconfigured or unsafe purchase recipients cannot open a request', () => {
  const request = buildPurchaseRequest([line('azoth', '12oz')]);
  for (const email of ['', undefined, null, 'hello', 'a@b', 'a b@nectar.example', 'a@nectar.example\nBcc:evil@example.com', 'a@nectar.example?bcc=evil@example.com', 'a@nectar.example,evil@example.com', `${'a'.repeat(250)}@nectar.example`]) {
    assert.equal(validPurchaseEmail(email), false);
    assert.throws(() => purchaseMailto(email, request), /purchase email address has not been configured/);
  }
  assert.equal(validPurchaseEmail('orders@nectar.example'), true);
});

test('empty or fully invalid carts cannot become purchase requests', () => {
  for (const cart of [[], null, {}, 'cart', [line('unknown', '12oz')], [line('azoth', '12oz', 0)]]) {
    assert.throws(() => buildPurchaseRequest(cart), /Add a coffee to your bag first/);
  }
});
