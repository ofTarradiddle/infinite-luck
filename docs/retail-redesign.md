# Retail redesign — previous edition

The current edition supersedes this release’s slogan, general brew guides, and black-coffee imagery. See [the personal-cup update](personal-cup-update.md).

This update keeps the original boxed cup / inverted-F mark and the two coffees, while rebuilding the interface around a clear shopping path: choose a roast, choose a size, add to the saved bag, and review the purchase request.

## Design references

The current [Blue Bottle storefront](https://bluebottlecoffee.com/us/eng) informed the clear product hierarchy, photographic campaign area, direct product actions, and useful brewing entry points. The [Starbucks site](https://www.starbucks.com/) informed the confident use of large color blocks, restrained navigation, and obvious calls to action. [Glitch](https://glitchcoffee.com/) informed the quieter editorial attitude. These are design references, not copied branding, copy, or assets.

The resulting visual system is warm ivory, forest green, muted sage, and charcoal. Typography remains Cormorant and DM, served through the existing optimized WOFF2 files. The stylesheet is maintained as one coherent system rather than layers of historical overrides. Product, founder-story, modal, cart, and mobile layouts use the same spacing, controls, and type hierarchy.

No testimonials, ratings, product origins, tasting notes, subscriptions, stock claims, free-shipping offers, or affiliations were invented. The founder story retains only the supplied Disney-to-banking background. Packaging remains clearly described as a concept.

## Ten original mornings

All ten scenes are newly generated in ten separate built-in imagegen calls. They share the coffee-steam-to-city-fog idea but vary viewpoint, interior, materials, composition, lighting, and atmosphere:

1. `01-city-wakes` — pale oak and architectural predawn light.
2. `02-through-window` — an intimate walnut-and-marble apartment window.
3. `03-river-steam` — a river winding into the cup's steam.
4. `04-blue-hour` — a sparse espresso still life in deep blue.
5. `05-rain-on-glass` — rain, ceramic, and city rooftops.
6. `06-brooklyn-morning` — a warm brownstone kitchen and river haze.
7. `07-last-light` — a dark loft, walnut, and distant window lights.
8. `08-quiet-geometry` — ivory porcelain on pale stone.
9. `09-city-reflection` — dew, brushed steel, and an impossible reflected horizon.
10. `10-before-rush` — a wider apartment table before the day begins.

Optimized 1536 × 1024 WebPs live in `public/assets/hero/`. The original PNGs are preserved in `design-assets/hero-series/` and excluded from the published Pages artifact. The previous single-hero concepts remain archived in source.

Exact prompts, source paths, and built-in tool provenance:

- [Scenes 01–04](hero-prompts-01-04.md)
- [Scenes 05–07](hero-prompts-05-07.md)
- [Scenes 08–10](hero-prompts-08-10.md)

## Carousel and shopping behavior

`public/hero-slides.js` is the ten-scene manifest. `scripts/generate-seo.mjs` renders the first scene, caption, and controls into the homepage. Product and About pages retain their focused content without loading the carousel module. Social metadata and the homepage preload use the first scene.

`public/carousel.js` loads further scenes on demand, keeping the current image visible until its replacement loads. It supports arrow controls, direct scene selection, keyboard navigation, touch swipes, wraparound, play/pause, and recovery from failed image loads. Manual navigation pauses rotation. Automatic rotation pauses for hover, focus, offscreen content, hidden tabs, and open dialogs. Reduced-motion visitors start with rotation off and no image animation. Without JavaScript, the initial scene remains visible and inactive controls stay hidden.

The two-roast action adds one 12 oz bag of each atomically for a $24 coffee subtotal. Brewing entry points open the matching guide tab. Bag-size URLs, artwork changes, quantities, saved-cart validation, and order-request totals remain supported.

## Configuration still required

The public ordering email and separate hosted newsletter API URL remain owner configuration in `public/store-config.js`. When the ordering address is absent, the cart explains that requests are opening soon and still permits saving/copying bag details. When the hosted newsletter URL is absent, the public site labels the form “Coming soon” instead of accepting a submission that cannot be stored. The local signup preview continues to use private local storage. No contact address, payment destination, or API credential has been invented.

Automated tests cover catalog and order behavior, generated pages and SEO, ten unique image assets, carousel navigation/loading/pause states, swipes, failed loads, and racing requests. A browser surface was unavailable in this session; the images were visually inspected directly, and page/source/HTTP checks supplement the automated tests.
