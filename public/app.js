import { CATALOG, PRICES, normalizeCart, addItem, cartTotal, cartCount, cartKey } from './cart.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const storageKey = 'nectar-bag-v1';
let cart = [];
let storefront = { checkoutReady: false, supportEmail: null };
let returnFocus = null;
let toastTimer;
let checkoutBusy = false;
let requestId = null;
let pendingCheckout = null;

try { cart = normalizeCart(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { cart = []; }
try { pendingCheckout = JSON.parse(sessionStorage.getItem('nectar-checkout') || 'null'); } catch { /* Storage may be disabled. */ }

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const sizeLabel = size => size === '5lb' ? '5 lb' : '12 oz';

function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* The bag still works in memory. */ }
  requestId = null;
  $('#cart-error').textContent = '';
  renderCart();
}

function closeDialog(dialog) {
  if (!dialog?.open) return;
  dialog.close();
}

function openDialog(id, opener) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  const origin = opener || document.activeElement;
  const nextFocus = origin?.closest('dialog') ? returnFocus : origin;
  $$('dialog[open]').forEach(closeDialog);
  returnFocus = nextFocus;
  if (id === 'cart-dialog') renderCart();
  dialog.showModal();
}

$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    if (!$$('dialog[open]').length && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });
});

document.addEventListener('click', event => {
  const open = event.target.closest('[data-open]');
  if (open) openDialog(open.dataset.open, open);
  const close = event.target.closest('[data-close]');
  if (close) closeDialog(close.closest('dialog'));
});

function addToBag(roast, size, quantity = 1) {
  const result = addItem(cart, { roast, size, quantity });
  if (!result.ok) { notify(result.error); return false; }
  cart = result.cart;
  persist();
  return true;
}

$$('.size-options input').forEach(input => {
  input.addEventListener('change', () => {
    const card = input.closest('.product');
    const price = PRICES[input.value];
    $('[data-price]', card).innerHTML = `$${price}<span>.00</span>`;
    $('[data-add-price]', card).textContent = `— $${price}`;
    $('[data-size-helper]', card).textContent = input.value === '5lb' ? '80 oz · Save 10% per ounce' : 'Start your ritual · 12 oz bag';
  });
});

$$('[data-add]').forEach(button => {
  button.addEventListener('click', () => {
    const roast = button.dataset.add;
    const card = button.closest('.product');
    const size = $('input:checked', card).value;
    if (!addToBag(roast, size)) return;
    button.classList.add('added');
    setTimeout(() => button.classList.remove('added'), 1500);
    openDialog('cart-dialog', button);
    notify(`${CATALOG[roast].name} · ${sizeLabel(size)} added to your bag`);
  });
});

function emptyCartView() {
  return '<div class="empty-bag"><svg aria-hidden="true"><use href="#nectar-key"/></svg><h3>A little possibility.</h3><p>Your bag is waiting for a daily ritual.</p><a class="button button-lime" href="#coffee" data-close>Find your coffee <svg><use href="#arrow"/></svg></a></div>';
}

function renderCart() {
  $$('[data-cart-count]').forEach(element => { element.textContent = cartCount(cart); });
  $('#cart-total').textContent = money(cartTotal(cart));
  $('#cart-bottom').hidden = !cart.length;
  $('#checkout-button').disabled = checkoutBusy;
  $('#checkout-button').innerHTML = checkoutBusy ? 'Preparing your checkout…' : 'Continue to checkout <svg><use href="#arrow"/></svg>';
  $('#checkout-status').textContent = storefront.checkoutReady ? 'Your coffee. A simple, secure checkout.' : 'Online ordering is coming soon. Your bag is saved on this device.';
  if (!cart.length) { $('#cart-items').innerHTML = emptyCartView(); return; }
  $('#cart-items').innerHTML = cart.map(item => {
    const product = CATALOG[item.roast];
    const key = cartKey(item);
    return `<article class="cart-item"><div class="cart-image"><img src="/assets/${item.roast}.svg" alt="${product.name} packaging concept" width="70" height="100"></div><div><div class="cart-item-title"><h3>${product.name}</h3><b>${money(PRICES[item.size] * item.quantity)}</b></div><p>${product.roast} roast · ${sizeLabel(item.size)} · ${money(PRICES[item.size])} each</p><div class="cart-controls"><div class="quantity"><button data-quantity="${key}" data-delta="-1" aria-label="Decrease ${product.name} ${sizeLabel(item.size)} quantity">−</button><span aria-label="Quantity">${item.quantity}</span><button data-quantity="${key}" data-delta="1" aria-label="Increase ${product.name} ${sizeLabel(item.size)} quantity" ${item.quantity >= 20 ? 'disabled' : ''}>+</button></div><button class="remove-item" data-remove="${key}" aria-label="Remove ${product.name} ${sizeLabel(item.size)}">Remove</button></div></div></article>`;
  }).join('');
}

$('#cart-items').addEventListener('click', event => {
  const quantityButton = event.target.closest('[data-quantity]');
  const removeButton = event.target.closest('[data-remove]');
  if (!quantityButton && !removeButton) return;
  const key = quantityButton?.dataset.quantity || removeButton.dataset.remove;
  const item = cart.find(line => cartKey(line) === key);
  if (!item) return;
  if (quantityButton) item.quantity = Math.min(20, item.quantity + Number(quantityButton.dataset.delta));
  cart = cart.filter(line => cartKey(line) !== key || (quantityButton && line.quantity > 0));
  persist();
  const focusTarget = quantityButton && $(`[data-quantity="${key}"][data-delta="${quantityButton.dataset.delta}"]`);
  (focusTarget && !focusTarget.disabled ? focusTarget : $('#cart-items button, #cart-items a') || $('#cart-dialog [data-close]')).focus({ preventScroll: true });
  notify(removeButton || item.quantity < 1 ? `${CATALOG[item.roast].name} removed from your bag` : 'Your bag has been updated');
});

$$('[data-recommend]').forEach(button => {
  button.addEventListener('click', () => {
    closeDialog($('#finder-dialog'));
    const card = $(`[data-roast="${button.dataset.recommend}"]`);
    $$('.product').forEach(product => product.classList.remove('recommended'));
    card.classList.add('recommended');
    card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    setTimeout(() => $('[data-add]', card).focus({ preventScroll: true }), 400);
    notify(`Meet ${CATALOG[button.dataset.recommend].name}, your ${CATALOG[button.dataset.recommend].roast.toLowerCase()} roast.`);
  });
});

$('#try-both').addEventListener('click', () => {
  const first = addItem(cart, { roast: 'infinite-luck', size: '12oz', quantity: 1 });
  if (!first.ok) { notify(first.error); return; }
  const second = addItem(first.cart, { roast: 'azoth', size: '12oz', quantity: 1 });
  if (!second.ok) { notify(second.error); return; }
  cart = second.cart;
  persist();
  openDialog('cart-dialog', $('#try-both'));
  notify('One of each. A very good place to start.');
});

$$('[data-product]').forEach(button => {
  button.addEventListener('click', () => {
    const roast = button.dataset.product;
    const product = CATALOG[roast];
    $('#detail-image').src = `/assets/${roast}.svg`;
    $('#detail-image').alt = `${product.name} packaging design concept`;
    $('#detail-title').textContent = product.name;
    $('#detail-roast').textContent = `THE ${product.roast.toUpperCase()} ROAST`;
    $('#detail-description').textContent = product.description;
    $('#detail-shop').dataset.roast = roast;
    openDialog('product-dialog', button);
  });
});
$('#detail-shop').addEventListener('click', event => {
  const card = $(`[data-roast="${event.currentTarget.dataset.roast}"]`);
  closeDialog($('#product-dialog'));
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => $('input:checked', card).focus({ preventScroll: true }), 400);
});

function selectBrew(button, focus = false) {
  $$('[data-brew]').forEach(tab => {
    const active = tab === button;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
  if (focus) button.focus();
}
$$('[data-brew]').forEach(button => button.addEventListener('click', () => selectBrew(button)));
$('.brew-tabs').addEventListener('keydown', event => {
  const tabs = $$('[data-brew]');
  const index = tabs.indexOf(document.activeElement);
  if (index < 0) return;
  let next;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  if (next !== undefined) { event.preventDefault(); selectBrew(tabs[next], true); }
});

$('#clear-saved-bag').addEventListener('click', () => {
  cart = [];
  persist();
  notify('Your saved bag has been cleared.');
});

$('#checkout-button').addEventListener('click', async () => {
  if (checkoutBusy || !cart.length) return;
  $('#cart-error').textContent = '';
  if (!storefront.checkoutReady) {
    $('#cart-error').textContent = 'Online ordering is coming soon. Your bag is saved here for your next visit.';
    return;
  }
  checkoutBusy = true;
  renderCart();
  requestId ||= crypto.randomUUID();
  const checkoutCart = cart.map(item => ({ ...item }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: checkoutCart, requestId }), signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'We could not open checkout. Please try again.');
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('We could not open checkout. Please try again.');
    try { sessionStorage.setItem('nectar-checkout', JSON.stringify(checkoutCart)); } catch { /* Optional storage. */ }
    window.location.assign(url.href);
  } catch (error) {
    $('#cart-error').textContent = error.name === 'AbortError' ? 'Checkout took a little too long. Please try again; your bag is still here.' : error.message;
  } finally {
    clearTimeout(timeout);
    checkoutBusy = false;
    renderCart();
  }
});

async function loadStorefront() {
  try {
    const response = await fetch('/api/storefront');
    if (!response.ok) return;
    const data = await response.json();
    storefront = { checkoutReady: data.checkoutReady === true, supportEmail: typeof data.supportEmail === 'string' ? data.supportEmail : null };
    if (storefront.supportEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storefront.supportEmail)) {
      const link = $('[data-contact]');
      link.href = `mailto:${storefront.supportEmail}`;
      link.hidden = false;
    }
    if (storefront.checkoutReady) $('#ordering-info').textContent = 'Choose your coffee and size, then continue to Stripe’s secure checkout. Shipping and applicable tax are shown before you pay. Your bag is saved in this browser.';
    renderCart();
  } catch { /* Offline browsing keeps the bag available. */ }
}

async function handlePaymentReturn() {
  const params = new URLSearchParams(location.search);
  const state = params.get('checkout');
  if (!state) return;
  if (state === 'cancelled') { history.replaceState({}, '', location.pathname + location.hash); openDialog('cart-dialog'); notify('Your bag is still here whenever you’re ready.'); return; }
  if (state !== 'success') return;
  openDialog('order-dialog');
  $('#order-retry').hidden = true;
  $('#order-message').textContent = 'Checking your payment…';
  const session = params.get('session_id');
  if (!session || !/^cs_(?:test_|live_)?[A-Za-z0-9]{10,200}$/.test(session)) { $('#order-message').textContent = 'We could not verify this payment. Please check your payment confirmation before placing another order.'; return; }
  try {
    const response = await fetch(`/api/order?session_id=${encodeURIComponent(session)}`);
    const data = await response.json();
    if (response.ok && data.paid === true) {
      history.replaceState({}, '', location.pathname + location.hash);
      if (JSON.stringify(cart) === JSON.stringify(pendingCheckout)) { cart = []; persist(); }
      try { sessionStorage.removeItem('nectar-checkout'); } catch { /* Optional storage. */ }
      $('#order-message').textContent = 'Thank you. Your payment is confirmed. We’re glad Nectar is part of your next ritual. Keep your Stripe confirmation for your order details.';
    } else { $('#order-message').textContent = 'Your payment is still being confirmed. Please check your payment confirmation before placing another order.'; $('#order-retry').hidden = false; }
  } catch { $('#order-message').textContent = 'We could not verify your payment right now. Please check your payment confirmation before placing another order.'; $('#order-retry').hidden = false; }
}

$('#order-retry').addEventListener('click', handlePaymentReturn);

window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  try { cart = normalizeCart(JSON.parse(event.newValue || '[]')); } catch { cart = []; }
  requestId = null;
  renderCart();
});
$$('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
renderCart();
loadStorefront();
handlePaymentReturn();
