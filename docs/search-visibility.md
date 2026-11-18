# Search visibility

The site keeps its minimal homepage, gives each coffee a crawlable, focused page, and includes the founder's story:

- `/coffee/azoth-dark-roast/`: Azoth dark roast coffee, 12 oz and 5 lb bags.
- `/coffee/infinite-luck-light-roast/`: Infinite Luck light roast coffee, 12 oz and 5 lb bags.
- `/ryans-cup/`: the original in-cup coffee method, with an 8 fl oz cup, fine grounds, and gravity-driven settling.
- `/about/`: the founder's love of coffee, from Disney to Starbucks to a large bank in New York City.

These match actual products and customer choices. There are no invented origins, tasting notes, certifications, reviews, location claims, or stock promises. Prices are USD; shipping and any applicable tax are additional. Packaging images are marked as concepts.

## Maintaining the pages

`scripts/generate-seo.mjs` creates the homepage metadata, product pages, founder story, Ryan’s Cup article, and image sitemap from the shared homepage UI, `public/cart.js`, `scripts/about-page.mjs`, `scripts/ryans-cup.mjs`, and the product artwork. Run `npm run generate:seo` after source changes. Both `npm run dev` and Pages builds run it automatically. Edit the generator, About content module, or homepage source rather than generated `public/coffee/` and `public/about/` files. Tests catch stale generated pages and mismatched catalog data. The About page uses AboutPage schema connected to the organization, without product or sale markup.

Each page has a unique title, description, self-canonical, social sharing metadata, and initial-HTML structured data. Product variants have direct `?size=12oz` and `?size=5lb` links that select the matching bag, price, and cart size. Both variants share the product's canonical URL.

ProductGroup markup describes confirmed products and sizes. It intentionally withholds actionable Offer markup while `PURCHASE_EMAIL` is empty. Configuring a valid address and rebuilding adds the real USD offers; verify the email-request flow before publication. Stock, shipping, returns, and review markup remain absent until accurate details are available. Structured data does not guarantee a rich result or a ranking.

The live CSS uses self-hosted WOFF2 subsets (about 119 KB total versus 680 KB for the original TTFs), retains font-display:swap, and keeps the existing font licenses and original sources. The hero has explicit dimensions and high fetch priority; below-the-fold storefront images load lazily.

## Owner setup after publication

1. Add `ofnectar.com` as a Domain property in [Google Search Console](https://search.google.com/search-console/). Google supplies a unique DNS TXT verification value; add that exact value in Squarespace DNS. The existing CNAME for `www` stays unchanged.
2. Submit `https://www.ofnectar.com/sitemap.xml` in Search Console. Inspect the home page and both product URLs to check Google's rendered page, canonical selection, and indexing status.
3. Check the [Rich Results Test](https://search.google.com/test/rich-results) after enabling ordering. Without offers, reviews, or ratings, product rich-result eligibility is intentionally incomplete.
4. Use the Performance report to track actual impressions, clicks, and queries such as “Azoth dark roast coffee,” “dark roast coffee,” “Infinite Luck light roast,” and “5 lb coffee bags.” These are relevant phrases, not claimed keyword-volume estimates. Compare results over time before expanding content.

Search Console verification and sitemap submission require the owner's account and have not been performed by this repository. Do not add tracking scripts, fake testimonials, or generic search-targeted articles to manufacture signals. Useful future additions are confirmed coffee origins, actual tasting notes, roasting information, real product photography, and clear shipping/return/contact details.

## Current primary guidance consulted

- [Google ecommerce site structure](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure): use crawlable links to product pages.
- [Product variants](https://developers.google.com/search/docs/appearance/structured-data/product-variants): group sizes and make variants directly selectable.
- [Merchant listings](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing): purchase eligibility and accurate product data.
- [Helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): publish useful, factual information for customers.
- [AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): the same SEO foundation applies; special AI text files are unnecessary.

The sitemap now includes image URLs for all ten JavaScript-selected carousel scenes and the images on each content/product page. Ryan’s Cup uses Article and BreadcrumbList metadata. FAQ and HowTo rich-result markup are not added: Google has discontinued those features. Social sharing uses a branded homepage card and record-specific product/article images; only confirmed social profile URLs enter sameAs metadata. See [the current update notes](personal-cup-update.md) for sources and scope.
