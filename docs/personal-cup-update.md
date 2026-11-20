# Your coffee, your cup, in your image.

Current artwork note: the gallery PNG masters and WebPs have been replaced with the owner-supplied patterned-cup images. See [current images and provenance](user-cup-images.md) and [current slogan and logo](cup-logo-update.md). The generation prompts below describe the earlier edition.

The current edition replaces the previous slogan and opening copy with a larger editorial masthead, a ten-scene crema carousel, a roast index, and a signature ritual. The original boxed cup / inverted-F mark remains the brand lockup before Nectar. The founder’s supplied journey is Disney → Starbucks → a large bank in New York City; this describes the founder, not a claimed cafe address or employer endorsement.

## Ryan’s Cup

`scripts/ryans-cup.mjs` defines the original `/ryans-cup/` page. The method uses a grind between espresso and Turkish, grounds placed directly into an 8 fl oz cup, hot water, and a rest while grounds settle. The cup’s capacity is distinguished from a water dose. No coffee weight, temperature, fixed settling time, or health claim is invented. The general brewing cards, tabs, dialog, and their JavaScript bindings have been removed.

The explanation uses immersion and gravity-driven settling rather than claiming that the grounds form a filter. Sedimentation of coffee grounds is discussed in section VI.B of [Mathijssen et al., *Culinary fluid mechanics and other currents in food science*, Rev. Mod. Phys. 95, 025004](https://journals.aps.org/rmp/abstract/10.1103/RevModPhys.95.025004). This supports settling under gravity; it does not establish a universal settling time, complete clarity, or espresso crema from this preparation method. The requested crema in the editorial imagery is an artistic image treatment, not a promised brewing result.

## Updated imagery

Each of the ten current coffee scenes was individually edited with built-in imagegen. Only the visible coffee surface was requested to change to realistic golden-hazelnut crema, with each scene’s cup, light, interior, city, and steam-to-fog composition preserved. Every result was inspected. These are generative edits and are not claimed to be pixel-identical outside the edited surface.

- Deployed WebPs: `public/assets/hero/01-city-wakes.webp` through `public/assets/hero/10-before-rush.webp`, following the IDs in `public/hero-slides.js`.
- Current full-resolution PNGs: `design-assets/hero-series/` with matching IDs. Earlier versions remain in Git history.
- Exact edit prompts: [01–04](crema-prompts-01-04.md), [05–07](crema-prompts-05-07.md), [08–10](crema-prompts-08-10.md).
- Earlier unused single-hero WebPs moved to `design-assets/previous-hero/`.

Crema image URLs and frontend entry points have version parameters so returning visitors receive the updated artwork and layout. Only the first carousel scene is loaded initially; further scenes remain on demand.

The new site-wide social card is `public/og.png`, generated in one built-in imagegen request with the exact new headline. Its actual size is 1672 × 941. [Exact card prompt and provenance](personal-social-card-prompt.md). This intentional root PNG is allowed in the Pages artifact; all other PNG originals remain excluded. Product previews use the corresponding bag; About and Ryan’s Cup use the imagery actually displayed on those pages.

## Search discovery and sharing

The five canonical pages are the homepage, both roast pages, the founder story, and Ryan’s Cup. Ryan’s Cup adds useful original content for direct-in-cup coffee and fine-grind brewing searches. It uses Article and BreadcrumbList data, without recipe, rating, or product claims. The sitemap now includes all ten carousel images, as well as the images from each article/product page, following [Google’s image sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps).

Metadata, visible content, canonicals, internal navigation, and item-specific social previews agree. These changes follow [Google’s current image guidance](https://developers.google.com/search/docs/appearance/google-images) and [AI search fundamentals](https://developers.google.com/search/docs/appearance/ai-features); no traffic or ranking increase is promised. HowTo and FAQ rich-result markup are deliberately absent: [HowTo results were deprecated](https://developers.google.com/search/blog/2023/08/howto-faq-changes), and [Google discontinued FAQ results in 2026](https://developers.google.com/search/updates#may-2026).

All pages offer native sharing (or a copy-link fallback) and a [Pinterest save link](https://developer.pinterest.com/docs/web-features/buttons/). No posts or messages are sent automatically. The `SOCIAL_PROFILES` list in `public/social-config.js` is intentionally empty until the owner supplies actual profile URLs. Only validated, explicitly configured HTTPS profiles appear as follow links and Organization sameAs data. No account handle is guessed.

The existing owner steps remain: configure the ordering email, deploy/configure the private signup API, and verify the site in Search Console before submitting the sitemap. These public-facing gaps are still presented honestly. No payment destination, private subscriber list, token, fake rating, or invented business address was added.
