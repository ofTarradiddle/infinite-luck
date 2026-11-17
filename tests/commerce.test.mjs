import test from "node:test";
import assert from "node:assert/strict";
import { handleCommerce } from "../server/commerce.mjs";

const ORIGIN = "https://nectar.example";
const ENV = {
  STRIPE_SECRET_KEY: "sk_test_not_a_real_key",
  STRIPE_SHIPPING_RATE_ID: "shr_test_rate",
  SHIPPING_COUNTRIES: "US,CA",
};
const REQUEST_ID = "9d18bf7a-d7e2-4f52-96b8-78c45bffdcbb";
const item = (roast = "infinite-luck", size = "12oz", quantity = 1) => ({ roast, size, quantity });
const request = (body = { items: [item()], requestId: REQUEST_ID }, headers = {}) => new Request(`${ORIGIN}/api/checkout`, {
  method: "POST",
  headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
async function withFetch(mock, run) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { await run(); } finally { globalThis.fetch = original; }
}

test("storefront exposes readiness only with complete valid shipping configuration", async () => {
  const get = (env) => handleCommerce(new Request(`${ORIGIN}/api/storefront`), env);
  assert.deepEqual(await (await get({})).json(), { checkoutReady: false, supportEmail: null });
  assert.deepEqual(await (await get({ ...ENV, SUPPORT_EMAIL: "orders@nectar.example" })).json(), {
    checkoutReady: true, supportEmail: "orders@nectar.example",
  });
  for (const countries of ["us", "US,ZZ", "", "US,", "XX"]) {
    assert.equal((await (await get({ ...ENV, SHIPPING_COUNTRIES: countries })).json()).checkoutReady, false);
  }
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_SHIPPING_RATE_ID", "SHIPPING_COUNTRIES"]) {
    assert.equal((await (await get({ ...ENV, [key]: undefined })).json()).checkoutReady, false);
  }
});

test("checkout uses server prices, merges duplicate variants, and sends shipping and tax settings", async () => {
  let captured;
  await withFetch(async (url, options) => {
    captured = { url, options, form: new URLSearchParams(options.body) };
    return Response.json({ url: "https://checkout.stripe.com/c/pay/cs_test_example" });
  }, async () => {
    const response = await handleCommerce(request({ items: [item("azoth", "5lb", 2), item("infinite-luck", "12oz", 1), item("azoth", "5lb", 3)], requestId: REQUEST_ID, price: 1 }), { ...ENV, STRIPE_AUTOMATIC_TAX: "true" });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).url, "https://checkout.stripe.com/c/pay/cs_test_example");
    assert.equal(captured.url, "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(captured.form.get("line_items[0][price_data][unit_amount]"), "7200");
    assert.equal(captured.form.get("line_items[0][quantity]"), "5");
    assert.equal(captured.form.get("line_items[1][price_data][unit_amount]"), "1200");
    assert.equal(captured.form.get("line_items[1][price_data][currency]"), "usd");
    assert.equal(captured.form.get("shipping_options[0][shipping_rate]"), ENV.STRIPE_SHIPPING_RATE_ID);
    assert.equal(captured.form.get("shipping_address_collection[allowed_countries][0]"), "US");
    assert.equal(captured.form.get("shipping_address_collection[allowed_countries][1]"), "CA");
    assert.equal(captured.form.get("automatic_tax[enabled]"), "true");
    assert.equal(captured.form.get("success_url"), `${ORIGIN}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    assert.equal(captured.form.get("cancel_url"), `${ORIGIN}/?checkout=cancelled`);
    assert.match(captured.options.headers["Idempotency-Key"], /^nectar-[a-f0-9]{64}$/);
  });
});

test("idempotency is stable across item ordering and changes with cart or request ID", async () => {
  const keys = [];
  await withFetch(async (_, options) => {
    keys.push(options.headers["Idempotency-Key"]);
    assert.equal(new URLSearchParams(options.body).has("automatic_tax[enabled]"), false);
    return Response.json({ url: "https://checkout.stripe.com/c/pay/test" });
  }, async () => {
    const a = item("azoth", "5lb", 1);
    const b = item("infinite-luck", "12oz", 2);
    for (const body of [
      { items: [a, b], requestId: REQUEST_ID },
      { items: [b, a], requestId: REQUEST_ID },
      { items: [a, { ...b, quantity: 3 }], requestId: REQUEST_ID },
      { items: [a, b], requestId: "8d18bf7a-d7e2-4f52-96b8-78c45bffdcbb" },
    ]) assert.equal((await handleCommerce(request(body), ENV)).status, 200);
  });
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[0], keys[2]);
  assert.notEqual(keys[0], keys[3]);
});

test("cross-origin and malformed carts cannot call the payment provider", async () => {
  await withFetch(() => { throw new Error("Provider must not be called"); }, async () => {
    assert.equal((await handleCommerce(request(undefined, { Origin: "https://evil.example" }), ENV)).status, 403);
    assert.equal((await handleCommerce(request(undefined, { Origin: "null" }), ENV)).status, 403);
    assert.equal((await handleCommerce(request(undefined, { "Sec-Fetch-Site": "cross-site" }), ENV)).status, 403);
    assert.equal((await handleCommerce(request(undefined, { "Content-Type": "text/plain" }), ENV)).status, 415);
    assert.equal((await handleCommerce(request("{"), ENV)).status, 400);
    for (const items of [[], [item("unknown")], [item("__proto__")], [item("azoth", "1lb")], [item("azoth", "12oz", 0)], [item("azoth", "12oz", 1.5)], [item("azoth", "12oz", 21)], [item("azoth", "12oz", 20), item("azoth", "12oz", 1)], Array(5).fill(item())]) {
      assert.equal((await handleCommerce(request({ items, requestId: REQUEST_ID }), ENV)).status, 400);
    }
    assert.equal((await handleCommerce(request({ items: [item()], requestId: "not-uuid" }), ENV)).status, 400);
    assert.equal((await handleCommerce(request("x".repeat(12_001)), ENV)).status, 413);
    assert.equal((await handleCommerce(request(), {})).status, 503);
  });
});

test("canonical origin prevents a different host from setting checkout redirects", async () => {
  await withFetch(async (_, options) => {
    const form = new URLSearchParams(options.body);
    assert.equal(form.get("cancel_url"), `${ORIGIN}/?checkout=cancelled`);
    return Response.json({ url: "https://checkout.stripe.com/c/pay/test" });
  }, async () => {
    const canonical = { ...ENV, PUBLIC_ORIGIN: ORIGIN };
    const preview = new Request("https://preview.example/api/checkout", request());
    assert.equal((await handleCommerce(preview, canonical)).status, 200);
    assert.equal((await handleCommerce(request(undefined, { Origin: "https://preview.example" }), canonical)).status, 403);
    assert.equal((await handleCommerce(request(), { ...ENV, PUBLIC_ORIGIN: "javascript:alert(1)" })).status, 503);
  });
});

test("Stripe failures and unexpected checkout URLs return generic errors without leaking provider details", async () => {
  for (const mock of [
    async () => Response.json({ error: { message: "secret provider details" } }, { status: 400 }),
    async () => Response.json({ url: "https://evil.example/checkout" }),
    async () => { throw new Error("secret network details"); },
  ]) {
    await withFetch(mock, async () => {
      const response = await handleCommerce(request(), ENV);
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /secret/);
    });
  }
});

test("order confirmation verifies Stripe payment status and discloses no customer details", async () => {
  const url = `${ORIGIN}/api/order?session_id=cs_test_a1234567890`;
  for (const paymentStatus of ["paid", "unpaid", "no_payment_required"]) {
    await withFetch(async (requested, options) => {
      assert.equal(requested, "https://api.stripe.com/v1/checkout/sessions/cs_test_a1234567890");
      assert.equal(options.headers.Authorization, `Bearer ${ENV.STRIPE_SECRET_KEY}`);
      return Response.json({ payment_status: paymentStatus, customer_details: { email: "private@example.com" } });
    }, async () => {
      const response = await handleCommerce(new Request(url), ENV);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { paid: paymentStatus === "paid" });
    });
  }
  assert.equal((await handleCommerce(new Request(`${ORIGIN}/api/order?session_id=../../customers`), ENV)).status, 400);
  assert.equal((await handleCommerce(new Request(url), {})).status, 503);
});

test("routes enforce methods and unknown paths fall through", async () => {
  for (const [path, method, allow] of [["/api/checkout", "GET", "POST"], ["/api/order", "POST", "GET"], ["/api/storefront", "POST", "GET"]]) {
    const response = await handleCommerce(new Request(`${ORIGIN}${path}`, { method }), ENV);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), allow);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(await handleCommerce(new Request(`${ORIGIN}/api/unknown`), ENV), null);
});
