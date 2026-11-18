# Nectar Coffee Roasters

An original charcoal-and-ivory storefront for Infinite Luck (light roast) and Azoth (dark roast). Both cost **$12 for 12 oz** or **$72 for 5 lb**. Includes fabric bag concept photography, a roast finder, a saved shopping bag, email purchase requests, and a notification signup list.

## Run locally

Requires Node.js 22 or later. No dependencies to install.

```sh
npm run dev                 # http://localhost:3000
npm test                    # Cart, order email, signup, storage and export tests
npm run check               # JavaScript syntax
npm run build               # Self-contained Worker in dist/server/index.js
npm run subscribers:export  # Private CSV for manually sending your updates
```

Refresh after frontend edits. Restart the server after changing server modules or `.env`.

## Purchase requests: Zelle or cash transfer

Set your public business email in **[public/store-config.js](public/store-config.js)**:

```js
export const PURCHASE_EMAIL = 'your-real-ordering-address@example.com';
```

The destination is intentionally empty until the owner supplies it. The email button stays disabled; customers can copy their request. No personal account address has been guessed.

Customers add coffee, choose **Request purchase**, select Zelle or cash transfer, and open a prefilled email with their coffee, size, quantity, subtotal, and optional name/city. They send the email themselves. Nectar replies with availability, shipping, any tax, the final total, and transfer instructions. Opening a draft is not a completed order or payment. The bag stays saved.

The website does not send messages, initiate transfers, collect card details, or assume that the business email is a Zelle payment destination. The prior Stripe server adapter remains in source for future use; it is not the current purchase flow.

## Notification signup storage

The signup form validates the email and requires consent. Success is shown only after the server saves the record. No automatic email is sent; you send the updates yourself.

**Local preview:** without GitLab settings, entries persist in `.nectar-data/subscribers.json` on this computer. Writes are serialized and atomic, and files have private permissions. This directory is gitignored and never served publicly.

**Hosted site:** configure a **private GitLab project**. No project or runtime token has been supplied, so the hosted form honestly reports unavailable storage until connected. It does not pretend browser storage is a subscriber database.

1. Create a private GitLab project with an initialized `main` branch, or select an existing private project. Use a separate project if your website source is public.
2. Create a project access token with the `api` scope and a role that can write to the selected branch. Repository Files API writes require `api`, rather than only `write_repository`.
3. Copy `.env.example` to `.env` locally, or set runtime environment values on the actual hosting provider:

```text
GITLAB_PROJECT_ID=your-group/your-private-project
GITLAB_TOKEN=<set privately; never paste in chat or commit>
GITLAB_API_URL=https://gitlab.com/api/v4
GITLAB_BRANCH=main
```

The server verifies private project visibility before writing. Each address becomes one `subscribers/<sha256-of-normalized-email>.json` record with email, time, consent and source. Duplicate signups are idempotent. Addresses stay out of filenames and commit messages. No public list route exists; private project members can read the record contents.

The adapter follows the official [GitLab Repository Files API](https://docs.gitlab.com/api/repository_files/). It includes request limits, origin validation, a honeypot and a basic per-instance throttle.

### Export your list

```sh
npm run subscribers:export
```

Writes `exports/subscribers.csv` containing email, signup time and consent. It exports GitLab when configured, otherwise the local file. Exports are gitignored, use private file permissions, and include spreadsheet-formula protection. The script prints a count and path, never addresses or tokens.

Local signups collected before connecting GitLab stay in the local file; there is no implicit migration. Export them separately before switching. Honor removal requests by removing the address from the active list and your sending list. Git retains history: keep the subscriber project private, and handle any required history purge separately with its owner.

## Git and hosting

This is a separate Git repository on `main`. Push to your own empty GitLab repository:

```sh
git remote add origin https://gitlab.com/YOUR-GROUP/nectar-coffee-roasters.git
git push -u origin main
```

The source project and subscriber project can be separate. No GitLab remote has been guessed or created. GitLab and GitHub CI files run tests and builds.

Private Sites preview: **https://nectar-coffee-roasters.dragonbloodemperor.chatgpt.site**. `.openai/hosting.json` retains its identity. The build embeds local assets and API in a Cloudflare Worker; `wrangler.jsonc` can target your Cloudflare account. GitLab Pages alone cannot execute the signup API. Set GitLab secrets on the actual Worker host, then redeploy.

When moving domains, update canonical/Open Graph URLs, the sitemap and `PUBLIC_ORIGIN`. Never commit `.env`, `.nectar-data/`, exports, tokens or subscriber records to public source.

Custom domain: `www.ofnectar.com` is registered with the site host, pending DNS validation. Exact CNAME and TXT records are in [docs/domain-setup.md](docs/domain-setup.md). The root `CNAME` file records the desired hostname; it does not change DNS at the domain provider.

## Edit the site

- `public/index.html`: content, signup form and purchase dialog.
- `public/styles.css`: brand and responsive layout.
- `public/app.js`: shopping, email draft and signup behavior.
- `public/order-request.js`: tested request text and mailto builder.
- `public/cart.js`: catalog, prices and cart operations.
- `server/newsletter.mjs`: signup validation and private GitLab persistence.
- `server/local-subscribers.mjs`: local private storage.
- `scripts/export-subscribers.mjs`: owner-only CSV export.

Packaging images are original **design concepts**, not claims about final manufacturing materials. No origins, tasting notes, reviews, certifications, roast dates or delivery guarantees were invented.

## Art

The new 1024 x 1536 transparent fabric images were created and inspected using the **built-in imagegen tool**:

- [Infinite Luck](public/assets/infinite-luck-label.webp)
- [Azoth](public/assets/azoth-label.webp)

Final sticker-label prompts and asset notes: [docs/asset-prompts-labels.md](docs/asset-prompts-labels.md). The prior directly printed fabric concepts are retained in [docs/asset-prompts.md](docs/asset-prompts.md).

The hero [coffee-ritual.webp](public/assets/coffee-ritual.webp) also uses built-in imagegen. Prompt: “Cinematic editorial coffee still life inspired by a quiet Tokyo kissaten. Ivory ceramic cup filled with black coffee, faint realistic steam, a few roasted beans on textured black stone. Cup large in the right two-thirds; left third dark negative space. Warm sunlight from upper left, near-black and deep brown backdrop, rich shadows, fine analog grain. No text, logos, watermark, people, or extra objects.”

Cormorant Garamond and DM Sans are self-hosted; SIL Open Font License notices are in [docs/licenses](docs/licenses). The supplied Nectar mark is preserved in `public/assets/nectar-original-logo.webp`.

## Verification limits

Automated tests cover cart integrity, exact email totals and escaping, consent, validation, durable local storage, private GitLab writes and CSV exports. Build checks cover API routes, asset references, security headers, MIME types and hidden files. Browser visual QA is unavailable here. The real purchase email and private GitLab connection still require owner configuration.
