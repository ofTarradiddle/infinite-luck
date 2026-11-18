# Nectar Coffee Roasters

GitHub Pages storefront for **www.ofnectar.com**, with original boxed-logo kraft bag concepts, Infinite Luck (light), Azoth (dark), and a saved shopping bag. Both coffees are **$12 for 12 oz** and **$72 for 5 lb**.

## Run locally

Requires Node.js 22 or later. No dependencies to install.

```sh
npm run dev                 # http://localhost:3000, including local signup storage
npm test
npm run check
npm run build               # GitHub Pages files in dist/pages
npm run build:newsletter    # Separate signup API in dist/newsletter
npm run subscribers:export  # Private CSV for manually sending updates
```

Refresh after frontend edits. Restart the development server after editing server code or `.env`.

## Push and deploy to GitHub

Repository: **https://github.com/ofTarradiddle/infinite-luck**. The local `origin` points to this repository. For future source updates:

```sh
git push origin main
```

The repository uses `main`.

GitHub Pages is configured for **GitHub Actions**, with custom domain `www.ofnectar.com` and enforced HTTPS. The included `.github/workflows/pages.yml` tests, builds, and publishes on pushes to `main` and can also be run manually. It uploads only `dist/pages`, never server code, secrets, subscriber data, or design archives.

Keep your existing Squarespace DNS CNAME: **`www → oftarradiddle.github.io.`**, provided the repository is owned by `oftarradiddle`. The root `CNAME` file is copied into the static output. For Actions deployments, setting the domain in GitHub Pages settings is required; the file alone does not configure it. See [docs/domain-setup.md](docs/domain-setup.md) and GitHub's [official custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

The build targets the root of the custom domain. Configure `www.ofnectar.com` before using it publicly; the default repository subpath URL is not the intended asset base. Enforce HTTPS once GitHub has issued its certificate.

The pending Sites custom-domain binding was removed. The Squarespace DNS record is preserved. The old private Sites preview remains separate; the primary deployment target is now GitHub Pages.

## Zelle and cash-transfer purchase requests

Set your public ordering email in **public/store-config.js**:

```js
export const PURCHASE_EMAIL = 'your-real-ordering-address@example.com';
```

It is currently empty because the owner has not supplied an address. Until configured, customers can copy their bag request; the email button stays disabled.

Customers choose **Request purchase**, select Zelle or cash transfer, and open an email draft containing exact items, quantities, sizes and subtotal, plus optional name/city. They send it themselves. Nectar replies with availability, shipping, tax if applicable, final total, and transfer instructions. Opening a draft does not place or pay for an order; the saved bag remains available. No messages, card charges or transfers are performed by this site.

## Notification signup: separate API, private list

[GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages); it cannot execute this project's server API or safely hold a GitLab token in frontend code. The separate **Cloudflare Worker** handles signup storage in a private GitLab project, matching the requested private mailing list. No automatic emails are sent.

1. Create/select a **private GitLab project** with an initialized `main` branch. Use a separate project if the website source is public.
2. Create a project-scoped token with `api` scope and permission to write to that branch. Keep it private.
3. Build and deploy the standalone API using your Cloudflare account:

```sh
npm run build:newsletter
npx wrangler secret put GITLAB_TOKEN --config wrangler.newsletter.jsonc
npx wrangler secret put GITLAB_PROJECT_ID --config wrangler.newsletter.jsonc
npx wrangler deploy --config wrangler.newsletter.jsonc
```

The CLI prompts for secret values; never put them in Git, public files or chat. Its configuration sets `PUBLIC_ORIGIN=https://www.ofnectar.com`, accepts only that exact frontend origin, and implements CORS for JSON signup requests. If you change the website domain, update the Worker origin too.

4. Copy the deployed Worker origin into **public/store-config.js**:

```js
export const NEWSLETTER_API_BASE = 'https://your-signup-worker.your-account.workers.dev';
```

5. Push the frontend change to GitHub and verify a real consented signup appears in your private GitLab project. The form reports success only after durable storage succeeds. Until the API and credentials are configured, hosted signup is unavailable and displays an honest error.

The API verifies private project visibility, normalizes/deduplicates addresses, uses hashed per-email record names, and records signup time and consent. There is no public list endpoint. No GitLab token, project access token or subscriber file is included in the Pages output. Adapter reference: [GitLab Repository Files API](https://docs.gitlab.com/api/repository_files/).

### Local list and CSV export

With no GitLab identity configured, `npm run dev` stores signups in `.nectar-data/subscribers.json` using atomic writes and private permissions. The directory is gitignored and not served. With GitLab identity settings present, incomplete configuration fails instead of silently falling back.

```sh
npm run subscribers:export
```

Exports GitLab when configured in `.env`, otherwise the local file, to private `exports/subscribers.csv`. Neither data nor exports belong in the public website source. Local entries are not automatically migrated when switching to GitLab. Honor removal requests in both the active list and your sending list; Git history may require separate removal handling.

## Source and builds

Search pages, the separate `/about/` founder story, metadata, product variant markup, and the sitemap are generated before local launch and Pages builds. Edit the founder story in `scripts/about-page.mjs`. The homepage uses the “Water, fire, earth, air. Aka coffee.” slogan and a generated city/coffee scene; see [the image prompt and source](docs/asset-prompts-city-dawn.md). See [docs/search-visibility.md](docs/search-visibility.md) for maintenance, confirmed search targets, and the owner's Search Console setup.

- `public/`: browser code, text, styles, images, and public configuration.
- `scripts/build-pages.mjs`: static artifact with CNAME and `.nojekyll`.
- `server/newsletter-worker.mjs`: exact-origin standalone signup API.
- `server/newsletter.mjs`: validation and private GitLab persistence.
- `public/order-request.js`: tested email draft builder.
- `public/cart.js`: catalog, prices and saved-cart validation.
- `public/product-visuals.js`: size-specific artwork for cards, product details, and cart.

The previous full-site Worker remains available with `npm run build:worker`; it uses `.openai/hosting.json` for the old Sites preview. That manifest is not required for the GitHub Pages build. `server/commerce.mjs` retains the earlier optional Stripe adapter, but it is not the current email-request purchase flow.

## Brand and artwork

The cup-and-inverted-F graphic is the prefix to the Nectar wordmark. There are no typed “oF” letters before the name. See [docs/brand-guide.md](docs/brand-guide.md).

The active transparent 1024 × 1536 kraft bags use cream paper labels and boxed cup-and-inverted-F logo above Nectar. Each roast has distinct 12 oz and 5 lb images; the chosen size updates the graphic, price, product detail and cart thumbnail:

- [Infinite Luck · 12 oz](public/assets/infinite-luck-12oz-mark.webp) / [5 lb](public/assets/infinite-luck-5lb-mark.webp)
- [Azoth · 12 oz](public/assets/azoth-12oz-mark.webp) / [5 lb](public/assets/azoth-5lb-mark.webp)

Built-in imagegen EDIT prompts, tool and asset notes: [docs/asset-prompts-symbol-bags.md](docs/asset-prompts-symbol-bags.md). Older direct-print concepts remain in `design-assets/previous-bags` and are excluded from the public build. The product pictures are design concepts, not claims about final manufacturing materials.

The hero `public/assets/coffee-ritual.webp` was also created with built-in imagegen: “Cinematic editorial coffee still life inspired by a quiet Tokyo kissaten. Ivory ceramic cup filled with black coffee, faint realistic steam, a few roasted beans on textured black stone. Cup large in the right two-thirds; left third dark negative space. Warm sunlight from upper left, near-black and deep brown backdrop, rich shadows, fine analog grain. No text, logos, watermark, people, or extra objects.”

Fonts are self-hosted Cormorant Garamond and DM Sans; license notices are in `docs/licenses`. No tasting notes, origins, reviews, certifications, roast dates or delivery guarantees were invented.

## Remaining configuration

The purchase email, deployed signup API URL, and private GitLab credentials still need the owner's values. Source is maintained in `ofTarradiddle/infinite-luck`. All 50 tests pass. The initial [GitHub Pages deployment](https://github.com/ofTarradiddle/infinite-luck/actions/runs/44211798125) succeeded, and the live HTTPS page, JavaScript, and all four bag images were verified against the local build. Browser visual QA was unavailable in this environment.
