/**
 * Nectar's dependency-free Stripe checkout adapter for Cloudflare Workers.
 * Required runtime environment: STRIPE_SECRET_KEY, STRIPE_SHIPPING_RATE_ID,
 * SHIPPING_COUNTRIES (comma-separated uppercase ISO 3166-1 alpha-2 codes).
 * Optional: PUBLIC_ORIGIN (canonical http(s) origin), SUPPORT_EMAIL,
 * STRIPE_AUTOMATIC_TAX="true" (requires Stripe Tax to be configured).
 * Configure Stripe's shipping rate, business details, receipts, fulfillment,
 * tax settings and policies before enabling live payments. Stripe stores orders.
 */

const MAX_BODY_BYTES = 12_000;
const MAX_QUANTITY = 20;
const ROASTS = {
  "infinite-luck": "Infinite Luck · Light Roast",
  azoth: "Azoth · Dark Roast",
};
const SIZES = {
  "12oz": { label: "12 oz", cents: 1200 },
  "5lb": { label: "5 lb", cents: 7200 },
};
const ISO_COUNTRIES = new Set((
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" "));

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function configuration(env) {
  const countries = typeof env.SHIPPING_COUNTRIES === "string"
    ? env.SHIPPING_COUNTRIES.split(",").map((country) => country.trim())
    : [];
  const valid = countries.length > 0 && countries.length <= ISO_COUNTRIES.size &&
    countries.every((country) => ISO_COUNTRIES.has(country));
  return {
    ready: Boolean(
      typeof env.STRIPE_SECRET_KEY === "string" && env.STRIPE_SECRET_KEY.trim() &&
      typeof env.STRIPE_SHIPPING_RATE_ID === "string" && env.STRIPE_SHIPPING_RATE_ID.trim() && valid
    ),
    countries: [...new Set(countries)],
  };
}

function canonicalOrigin(request, env) {
  const url = new URL(env.PUBLIC_ORIGIN || request.url);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid origin configuration");
  }
  if (env.PUBLIC_ORIGIN && (url.pathname !== "/" || url.search || url.hash)) {
    throw new Error("PUBLIC_ORIGIN must contain only an origin");
  }
  return url.origin;
}

async function readJson(request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
    return { error: json({ error: "Your cart request is too large." }, 413) };
  }
  if (!request.body) return { error: json({ error: "Please send a valid cart." }, 400) };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: json({ error: "Your cart request is too large." }, 413) };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { error: json({ error: "Please send a valid cart." }, 400) };
  } finally {
    reader.releaseLock();
  }
}

function validateCart(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 4 ||
      typeof body.requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
    return null;
  }
  const variants = new Map();
  for (const item of body.items) {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        typeof item.roast !== "string" || typeof item.size !== "string" ||
        !Object.hasOwn(ROASTS, item.roast) || !Object.hasOwn(SIZES, item.size) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      return null;
    }
    const key = `${item.roast}:${item.size}`;
    const quantity = (variants.get(key)?.quantity || 0) + item.quantity;
    if (quantity > MAX_QUANTITY) return null;
    variants.set(key, { roast: item.roast, size: item.size, quantity });
  }
  return [...variants.values()].sort((a, b) => `${a.roast}:${a.size}`.localeCompare(`${b.roast}:${b.size}`));
}

async function idempotencyKey(items, requestId) {
  const input = new TextEncoder().encode(JSON.stringify({ items, requestId: requestId.toLowerCase() }));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `nectar-${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function stripeRequest(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error("Payment provider failed");
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function createCheckout(request, env, config) {
  let origin;
  try {
    origin = canonicalOrigin(request, env);
  } catch {
    return json({ error: "Checkout is temporarily unavailable. Please try again later." }, 503);
  }
  if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Start checkout from this website." }, 403);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    return json({ error: "Please send your cart as JSON." }, 415);
  }
  if (!config.ready) {
    return json({ error: "Online checkout is not open yet. Please come back soon." }, 503);
  }
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const items = validateCart(parsed.value);
  if (!items) return json({ error: "Please check the items and quantities in your cart." }, 400);

  const form = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    "shipping_options[0][shipping_rate]": env.STRIPE_SHIPPING_RATE_ID.trim(),
  });
  config.countries.forEach((country, index) => {
    form.set(`shipping_address_collection[allowed_countries][${index}]`, country);
  });
  if (env.STRIPE_AUTOMATIC_TAX === "true") form.set("automatic_tax[enabled]", "true");
  items.forEach((item, index) => {
    const prefix = `line_items[${index}]`;
    form.set(`${prefix}[price_data][currency]`, "usd");
    form.set(`${prefix}[price_data][unit_amount]`, String(SIZES[item.size].cents));
    form.set(`${prefix}[price_data][product_data][name]`, `${ROASTS[item.roast]} · ${SIZES[item.size].label}`);
    form.set(`${prefix}[price_data][product_data][metadata][roast]`, item.roast);
    form.set(`${prefix}[price_data][product_data][metadata][size]`, item.size);
    form.set(`${prefix}[quantity]`, String(item.quantity));
  });
  try {
    const session = await stripeRequest("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": await idempotencyKey(items, parsed.value.requestId),
      },
      body: form,
    });
    const checkout = new URL(session.url);
    if (checkout.protocol !== "https:" || checkout.hostname !== "checkout.stripe.com" || checkout.username || checkout.password) {
      throw new Error("Invalid checkout response");
    }
    return json({ url: checkout.href });
  } catch {
    return json({ error: "We couldn’t start checkout. Your card has not been charged. Please try again." }, 502);
  }
}

async function orderStatus(url, env) {
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId || !/^cs_(?:test_|live_)?[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return json({ error: "This order link is invalid." }, 400);
  }
  if (typeof env.STRIPE_SECRET_KEY !== "string" || !env.STRIPE_SECRET_KEY.trim()) {
    return json({ error: "Order confirmation is temporarily unavailable." }, 503);
  }
  try {
    const session = await stripeRequest(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}` },
    });
    return json({ paid: session.payment_status === "paid" });
  } catch {
    return json({ error: "We couldn’t verify your payment yet. Please check your receipt or try again." }, 502);
  }
}

/** Return a Response for a supported commerce route, or null for other paths. */
export async function handleCommerce(request, env = {}) {
  const url = new URL(request.url);
  const config = configuration(env);
  if (url.pathname === "/api/storefront") {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
    const supportEmail = typeof env.SUPPORT_EMAIL === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SUPPORT_EMAIL.trim())
      ? env.SUPPORT_EMAIL.trim() : null;
    return json({ checkoutReady: config.ready, supportEmail });
  }
  if (url.pathname === "/api/checkout") {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
    return createCheckout(request, env, config);
  }
  if (url.pathname === "/api/order") {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
    return orderStatus(url, env);
  }
  return null;
}
