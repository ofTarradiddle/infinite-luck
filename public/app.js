import { CATALOG, PRICES, normalizeCart, addItem, cartTotal, cartCount, cartKey } from './cart.js';
import { PURCHASE_EMAIL, NEWSLETTER_API_BASE } from './store-config.js';
import { newsletterEndpoint } from './newsletter-client.js';
import { buildPurchaseRequest, purchaseMailto, validPurchaseEmail } from './order-request.js';
import { getProductVisual } from './product-visuals.js';
import { productPath, requestedSize } from './product-links.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const storageKey = 'nectar-bag-v1';
let cart = [];
let purchaseCart = [];
let returnFocus = null;
let toastTimer;

try { cart = normalizeCart(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { cart = []; }

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
  if (open) {
    openDialog(open.dataset.open, open);
  }
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

function updateProductCard(card) {
  const size = $('.size-options input:checked', card).value;
  const visual = getProductVisual(card.dataset.roast, size);
  const image = $('[data-product-image]', card) || $('.product-art > img', card);
  image.src = visual.src;
  image.alt = visual.alt;
  card.dataset.size = visual.size;
  const price = PRICES[size];
  $('[data-price]', card).innerHTML = `$${price}<span>.00</span>`;
  $('[data-add-price]', card).textContent = `— $${price}`;
  $('[data-size-helper]', card).textContent = size === '5lb' ? '5 lb bag · 80 oz' : '12 oz bag';
}

$$('.product[data-roast]').forEach(card => {
  if (card.hasAttribute('data-product-page')) {
    $(`.size-options input[value="${requestedSize(location.search)}"]`, card).checked = true;
  }
  updateProductCard(card);
});
$$('.size-options input').forEach(input => {
  input.addEventListener('change', () => {
    const card = input.closest('.product');
    updateProductCard(card);
    if (card.hasAttribute('data-product-page')) {
      const url = new URL(location.href);
      url.searchParams.set('size', input.value);
      history.replaceState(null, '', url);
    }
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
  return '<div class="empty-bag"><svg aria-hidden="true"><use href="#nectar-key"/></svg><h3>Your bag is empty.</h3><p>Your next cup starts here.</p><a class="button button-lime" href="/#coffee" data-close>Find your coffee <svg><use href="#arrow"/></svg></a></div>';
}

function renderCart() {
  $$('[data-cart-count]').forEach(element => { element.textContent = cartCount(cart); });
  $('#cart-total').textContent = money(cartTotal(cart));
  $('#cart-bottom').hidden = !cart.length;
  $('#checkout-button').textContent = validPurchaseEmail(PURCHASE_EMAIL) ? 'Request purchase →' : 'Review your bag →';
  $('#checkout-status').textContent = validPurchaseEmail(PURCHASE_EMAIL)
    ? 'Zelle or cash transfer · email to order.'
    : 'Order requests are opening soon. Your bag stays saved.';
  if (!cart.length) { $('#cart-items').innerHTML = emptyCartView(); return; }
  $('#cart-items').innerHTML = cart.map(item => {
    const product = CATALOG[item.roast];
    const key = cartKey(item);
    const visual = getProductVisual(item.roast, item.size);
    return `<article class="cart-item"><div class="cart-image"><img src="${visual.src}" alt="${visual.alt}" width="70" height="100"></div><div><div class="cart-item-title"><h3>${product.name}</h3><b>${money(PRICES[item.size] * item.quantity)}</b></div><p>${product.roast} roast · ${sizeLabel(item.size)} · ${money(PRICES[item.size])} each</p><div class="cart-controls"><div class="quantity"><button data-quantity="${key}" data-delta="-1" aria-label="Decrease ${product.name} ${sizeLabel(item.size)} quantity">−</button><span aria-label="Quantity">${item.quantity}</span><button data-quantity="${key}" data-delta="1" aria-label="Increase ${product.name} ${sizeLabel(item.size)} quantity" ${item.quantity >= 20 ? 'disabled' : ''}>+</button></div><button class="remove-item" data-remove="${key}" aria-label="Remove ${product.name} ${sizeLabel(item.size)}">Remove</button></div></div></article>`;
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
    if (!card) { location.href = productPath(button.dataset.recommend); return; }
    $$('.product').forEach(product => product.classList.remove('recommended'));
    card.classList.add('recommended');
    card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    setTimeout(() => $('[data-add]', card).focus({ preventScroll: true }), 400);
    notify(`${CATALOG[button.dataset.recommend].name} · ${CATALOG[button.dataset.recommend].roast} roast.`);
  });
});

$$('[data-try-both]').forEach(button => button.addEventListener('click', () => {
  const first = addItem(cart, { roast: 'infinite-luck', size: '12oz', quantity: 1 });
  if (!first.ok) { notify(first.error); return; }
  const second = addItem(first.cart, { roast: 'azoth', size: '12oz', quantity: 1 });
  if (!second.ok) { notify(second.error); return; }
  cart = second.cart;
  persist();
  openDialog('cart-dialog', button);
  notify('One of each. Added.');
}));

$$('[data-product]').forEach(button => {
  button.addEventListener('click', () => {
    const roast = button.dataset.product;
    const product = CATALOG[roast];
    const card = button.closest('.product');
    const size = $('.size-options input:checked', card).value;
    const visual = getProductVisual(roast, size);
    $('#detail-image').src = visual.src;
    $('#detail-image').alt = visual.alt;
    $('#product-dialog').dataset.size = visual.size;
    if ($('#detail-size')) $('#detail-size').textContent = `${visual.label} bag`;
    $('#detail-title').textContent = product.name;
    $('#detail-roast').textContent = `THE ${product.roast.toUpperCase()} ROAST`;
    $('#detail-description').textContent = product.description;
    $('#detail-shop').dataset.roast = roast;
    $('#detail-shop').textContent = `Choose ${visual.label} bag`;
    openDialog('product-dialog', button);
  });
});
$('#detail-shop').addEventListener('click', event => {
  const card = $(`[data-roast="${event.currentTarget.dataset.roast}"]`);
  closeDialog($('#product-dialog'));
  card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  setTimeout(() => $('input:checked', card).focus({ preventScroll: true }), 400);
});

$('#clear-saved-bag').addEventListener('click', () => {
  cart = [];
  persist();
  notify('Your saved bag has been cleared.');
});

function updatePurchaseRequest() {
  if (!purchaseCart.length) return;
  const details = {
    name: $('#purchase-name').value,
    location: $('#purchase-location').value,
    payment: $('input[name="payment"]:checked').value
  };
  const request = buildPurchaseRequest(purchaseCart, details);
  $('#purchase-email-body').value = request.body;
  $('#purchase-email-button').disabled = !validPurchaseEmail(PURCHASE_EMAIL);
  $('#purchase-email-status').textContent = validPurchaseEmail(PURCHASE_EMAIL)
    ? `To: ${PURCHASE_EMAIL}`
    : 'Email ordering is being prepared. You can copy your bag details below.';
  return request;
}

$('#checkout-button').addEventListener('click', () => {
  if (!cart.length) return;
  purchaseCart = cart.map(item => ({ ...item }));
  $('#purchase-summary').innerHTML = purchaseCart.map(item => `<div><span>${item.quantity} × ${CATALOG[item.roast].name} <small>${sizeLabel(item.size)}</small></span><strong>${money(PRICES[item.size] * item.quantity)}</strong></div>`).join('') + `<div class="purchase-subtotal"><span>Coffee subtotal</span><strong>${money(cartTotal(purchaseCart))}</strong></div>`;
  updatePurchaseRequest();
  openDialog('purchase-dialog', $('#checkout-button'));
});
$('#purchase-form').addEventListener('input', updatePurchaseRequest);
$('#purchase-form').addEventListener('change', updatePurchaseRequest);
$('#purchase-form').addEventListener('submit', event => {
  event.preventDefault();
  const request = updatePurchaseRequest();
  if (!request || !validPurchaseEmail(PURCHASE_EMAIL)) return;
  window.location.href = purchaseMailto(PURCHASE_EMAIL, request);
  $('#purchase-email-status').textContent = 'Send the draft from your email app. Your bag stays saved.';
});
$('#purchase-back').addEventListener('click', () => openDialog('cart-dialog', $('#purchase-back')));
$('#copy-purchase-request').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#purchase-email-body').value); notify('Purchase request copied.'); }
  catch { $('#purchase-email-body').focus(); $('#purchase-email-body').select(); notify('Select and copy your request from the text box.'); }
});

$('#newsletter-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = $('#newsletter-email');
  const message = $('#newsletter-message');
  const consent = $('input[name="consent"]', form);
  message.classList.remove('is-error');
  if (!email.value.trim() || !email.checkValidity()) {
    message.textContent = 'Please enter a valid email address.';
    message.classList.add('is-error');
    email.focus();
    return;
  }
  if (!consent.checked) {
    message.textContent = 'Please agree to receive email updates.';
    message.classList.add('is-error');
    consent.focus();
    return;
  }
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  message.textContent = 'Saving your email…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(newsletterEndpoint(NEWSLETTER_API_BASE, location.origin), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ email: email.value.trim(), consent: true, website: $('#newsletter-website').value })
    });
    if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Email signup is being prepared. Please try again soon.');
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error(result.error || 'We couldn’t save your email. Please try again.');
    message.textContent = 'You’re on the list.';
    form.reset();
  } catch (error) {
    message.textContent = error.name === 'AbortError' ? 'That took a little too long. Please try again.' : error.message;
    message.classList.add('is-error');
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    form.removeAttribute('aria-busy');
  }
});

// Static hosting has no same-origin signup API. Keep the local signup preview working.
if (!NEWSLETTER_API_BASE.trim() && ['www.ofnectar.com', 'ofnectar.com', 'oftarradiddle.github.io'].includes(location.hostname)) {
  const form = $('#newsletter-form');
  $$('input, button', form).forEach(control => { control.disabled = true; });
  $('button[type="submit"]', form).textContent = 'Coming soon';
  $('#newsletter-email').placeholder = 'Updates coming soon';
  $('#newsletter-message').textContent = 'Email signups are opening soon. Come back for the next update.';
}

if (validPurchaseEmail(PURCHASE_EMAIL)) {
  const contact = $('[data-contact]');
  contact.href = `mailto:${encodeURIComponent(PURCHASE_EMAIL)}`;
  contact.hidden = false;
}

window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  try { cart = normalizeCart(JSON.parse(event.newValue || '[]')); } catch { cart = []; }
  renderCart();
});
$$('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
renderCart();
