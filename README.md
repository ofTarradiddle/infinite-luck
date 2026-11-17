# Nectar Coffee Roasters

A complete, original coffee storefront with a charcoal-and-ivory visual identity, cinematic photography, celestial packaging concepts, and a direct shopping flow. Built as a new Git repository with no runtime packages or frontend framework lock-in.

## Run it

Install Node.js 22 or later. There are no dependencies to install.

```sh
npm run dev
```

Open **http://localhost:3000**. The dev server serves both the storefront and its commerce API. `public/index.html` should be served over HTTP rather than opened directly as a file.

```sh
npm test       # Cart and server checkout tests
npm run check # JavaScript syntax
npm run build # Self-contained Cloudflare Worker in dist/server/index.js
```

## What works

- Infinite Luck (light) and Azoth (dark), each in 12 oz ($12) and 5 lb ($72).
- Size-specific prices, accessible controls, an editable cart, mixed roasts, and a two-roast purchase shortcut.
- Browser-local cart persistence, cross-tab synchronization, and validated saved data.
- Roast finder, product details, a size comparison, FAQs, and keyboard-accessible brewing tabs.
- Responsive layouts and reduced-motion support.
- Server-side Stripe Checkout with authoritative prices, shipping-address collection, configured shipping rates, request validation, idempotency, and verified payment returns.
- Self-hosted fonts and assets, security headers, strict content security policy, and no ad trackers.

**Payments are not live.** No payment account was supplied. Until configured, checkout honestly explains that ordering is coming soon. The bag still works. No fake payment or order confirmation is shown.

## Enable Stripe when ready

1. Create your Stripe account and complete its business setup. Start in test mode.
2. Set up a Stripe shipping rate and decide which countries you fulfill. Add your customer contact, shipping/returns information, and confirm the coffee format (whole bean or ground) before selling. Replace the forthcoming-policy copy in `public/index.html`.
3. Copy `.env.example` to `.env` for local testing. Set `STRIPE_SECRET_KEY`, `STRIPE_SHIPPING_RATE_ID`, and `SHIPPING_COUNTRIES`. Never put a secret in `public/`, Git, or chat. Use your hosting provider's environment/secret settings in production.
4. Set `PUBLIC_ORIGIN` to the exact deployed origin, e.g. `https://your-domain.com`, and `SUPPORT_EMAIL` to a real monitored address. The site displays the support link when configured.
5. Configure taxes for your business. Set `STRIPE_AUTOMATIC_TAX=true` only after configuring Stripe Tax and any required registrations. The default is false; no tax rules are invented by this project.
6. Run a test checkout, verify the shipping total and payment in Stripe, verify the return page, and confirm receipt settings. Then switch to live Stripe credentials and a matching live shipping rate.

The API creates Stripe-hosted checkout sessions and redirects customers to `checkout.stripe.com`. It never collects card details. Prices sent by browsers are ignored; the server owns the catalog. A 5 lb bag is 80 oz: $0.90/oz versus $1.00/oz for 12 oz, so the bulk option costs 10% less per ounce.

Stripe Dashboard is the order record for this version. Fulfill orders from verified paid sessions in Stripe; the browser return page is not an automated fulfillment system. There is no stock management, subscription billing, shipping-label integration, or automated fulfillment webhook. Add a signature-verified Stripe webhook before automating fulfillment. If your checkout supports delayed payment methods, wait for verified payment before shipping.

Environment settings are documented in [.env.example](.env.example). The adapter is in [server/commerce.mjs](server/commerce.mjs), based on [Stripe's Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions/create).

## Put it in your own GitHub repository

This directory is its own Git repository on `main`; it can be pushed to any new empty repository. Create the repository in your Git host, then run inside this directory:

```sh
git remote add origin https://github.com/YOUR-ACCOUNT/nectar-coffee-roasters.git
git push -u origin main
```

If you already added `origin`, inspect `git remote -v` before changing it. The optional `sites` remote is the connected preview source, separate from your own `origin`.

`.github/workflows/check.yml` runs tests, syntax checks, and the build on pushes and pull requests. `.env`, credentials, build output, and editor state are ignored.

## Hosting

The project is registered with Sites. `.openai/hosting.json` records its identity. The build produces a self-contained Worker with assets embedded; it needs no database. For another Cloudflare account, `wrangler.jsonc` points to the same output. Build, set secrets on the target account, then deploy using your own Cloudflare tooling. Other hosts need a compatible Web Fetch/Response server adapter for the checkout API.

New Sites previews are private. Public launch, your domain, and live payments are separate owner decisions. When moving domains, update canonical/Open Graph URLs in `public/index.html`, the sitemap, `PUBLIC_ORIGIN`, and Stripe configuration.

## Edit the brand and products

- `public/index.html`: content and semantic page structure.
- `public/styles.css`: colors, typography, layouts, motion, and breakpoints.
- `public/app.js`: dialogs, product controls, cart presentation, checkout and payment-return flow.
- `public/cart.js`: display catalog, prices and cart operations.
- `server/commerce.mjs`: server catalog and payment adapter. **Update server and display prices together.**
- `public/assets/infinite-luck.svg` / `azoth.svg`: editable original packaging concepts. They are labeled as concepts on the site; replace with real product photography when available.
- `public/assets/nectar-original-logo.webp`: preserved user-supplied Nectar mark. The navigation uses a small, code-native interpretation of its cup/key motif.

No origins, tasting notes, customer reviews, certifications, roast dates, delivery guarantees, or sourcing claims were invented. Add verified details as the business develops.

## Art and references

The visual direction responds to the restraint of [Hetzerk](https://www.hetzerk.com/) and the focused coffee presentation of [Glitch Coffee](https://glitchcoffee.com/) while giving Nectar its own identity. No third-party website assets or text were reused.

The original photographic hero was created with the **built-in imagegen tool**, inspected, and saved as [public/assets/coffee-ritual.webp](public/assets/coffee-ritual.webp), 1536 × 1024. Final prompt:

> Cinematic editorial coffee still life inspired by a quiet Tokyo kissaten. Ivory ceramic cup filled with black coffee, faint realistic steam, a few roasted beans on textured black stone. Cup large in the right two-thirds; left third dark negative space. Warm sunlight from upper left, near-black and deep brown backdrop, rich shadows, fine analog grain. No text, logos, watermark, people, or extra objects.

Cormorant Garamond and DM Sans are self-hosted Google Fonts. Their SIL Open Font License notices are in [docs/licenses](docs/licenses).

## Verification

Automated coverage exercises server-authoritative pricing, malformed/cross-origin requests, shipping configuration, duplicate variants and quantity limits, Stripe failures, idempotent checkout, paid status, and saved-cart integrity. Build-level smoke checks cover asset delivery, MIME types, security headers, ETags, methods, and missing paths.

A browser was unavailable in the build environment, so visual layout and interactive behavior still need a human browser pass on desktop and mobile before public launch. No live payment test has been run because payment credentials have not been configured.
