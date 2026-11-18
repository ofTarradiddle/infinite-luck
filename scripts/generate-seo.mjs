import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, PRICES } from '../public/cart.js';
import { productPath } from '../public/product-links.js';
import { getProductVisual } from '../public/product-visuals.js';
import { PURCHASE_EMAIL } from '../public/store-config.js';
import { validPurchaseEmail } from '../public/order-request.js';
import { ABOUT_TITLE, ABOUT_DESCRIPTION, renderAboutContent } from './about-page.mjs';
import { HERO_SLIDES } from '../public/hero-slides.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export const SITE = 'https://www.ofnectar.com';
const BRAND = 'Nectar Coffee Roasters';
const HERO_IMAGE = HERO_SLIDES[0].src;
const HERO_ALT = HERO_SLIDES[0].alt;
const organization = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: BRAND, url: `${SITE}/`, logo: `${SITE}/assets/favicon.svg` };
const website = { '@type': 'WebSite', '@id': `${SITE}/#website`, name: BRAND, url: `${SITE}/`, publisher: { '@id': organization['@id'] }, inLanguage: 'en' };
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const sizeLabel = size => size === '5lb' ? '5 lb' : '12 oz';

export function productSchema(roast, { orderingEnabled = validPurchaseEmail(PURCHASE_EMAIL) } = {}) {
  const product = CATALOG[roast];
  const url = SITE + productPath(roast);
  return {
    '@type': 'ProductGroup', '@id': `${url}#product`, url,
    name: `${product.name} ${product.roast.toLowerCase()} roast coffee`,
    description: `${product.name} is our ${product.roast.toLowerCase()} roast coffee. Available in 12 oz ($12) and 5 lb ($72) bags. USD; shipping and tax confirmed separately.`,
    brand: { '@type': 'Brand', name: BRAND },
    productGroupID: roast, variesBy: ['https://schema.org/size'],
    hasVariant: Object.entries(PRICES).map(([size, price]) => ({
      '@type': 'Product', '@id': `${url}#${size}`, url: `${url}?size=${size}`,
      name: `${product.name} ${product.roast.toLowerCase()} roast coffee — ${sizeLabel(size)}`,
      description: `${product.name}, ${product.roast.toLowerCase()} roast coffee in a ${sizeLabel(size)} bag. Packaging shown is a concept.`,
      size: sizeLabel(size), image: SITE + getProductVisual(roast, size).src,
      additionalProperty: { '@type': 'PropertyValue', name: 'Roast level', value: `${product.roast} roast` },
      // An email destination must exist before advertising an actionable offer.
      // Availability, delivery, returns, reviews, and origins are unconfirmed.
      ...(orderingEnabled ? { offers: { '@type': 'Offer', url: `${url}?size=${size}`, priceCurrency: 'USD', price, seller: { '@id': organization['@id'] } } } : {}),
    })),
  };
}

function head({ title, description, pathname = '/', image = HERO_IMAGE, imageAlt = HERO_ALT, imageWidth = 1536, imageHeight = 1024, pageType = 'WebPage', aboutId = organization['@id'], graph = [] }) {
  const url = SITE + pathname;
  return `<!-- SEO:start -->
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:site_name" content="${BRAND}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="${SITE + image}">
  <meta property="og:image:alt" content="${escape(imageAlt)}">
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${SITE + image}">
  <meta name="twitter:image:alt" content="${escape(imageAlt)}">
  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': [organization, website, { '@type': pageType, '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': website['@id'] }, about: { '@id': aboutId }, inLanguage: 'en' }, ...graph] })}</script>
  <!-- SEO:end -->`;
}

function replaceHead(html, metadata) {
  const replacement = head(metadata);
  if (!html.includes('<!-- SEO:start -->')) throw new Error('The homepage SEO markers are missing.');
  return html.replace(/<!-- SEO:start -->[\s\S]*?<!-- SEO:end -->/, () => replacement);
}

export function renderHeroGallery() {
  const first = HERO_SLIDES[0];
  return `<!-- HERO:start -->
      <div class="hero-gallery" data-carousel role="region" aria-roledescription="carousel" aria-labelledby="scene-gallery-title">
        <div class="scene-frame" id="scene-frame" data-scene-frame><img class="scene-image" src="${first.src}" alt="${escape(first.alt)}" width="${first.width}" height="${first.height}" fetchpriority="high"></div>
        <div class="scene-caption"><div><p class="eyebrow" id="scene-gallery-title">BEFORE THE CITY WAKES</p><span data-scene-title>${first.title}</span></div><span class="scene-count" data-scene-count>01 / 10</span></div>
        <div class="scene-controls" data-scene-controls hidden><div class="scene-dots" role="group" aria-label="Choose a scene">${HERO_SLIDES.map((slide, index) => `<button data-scene="${index}" aria-label="Show scene ${index + 1}: ${escape(slide.title)}" aria-controls="scene-frame" aria-pressed="${index === 0}"><span></span></button>`).join('')}</div><select class="scene-select" data-scene-select aria-label="Choose a scene" aria-controls="scene-frame">${HERO_SLIDES.map((slide, index) => `<option value="${index}">${String(index + 1).padStart(2, '0')} · ${escape(slide.title)}</option>`).join('')}</select><div class="scene-arrows"><button data-scene-play aria-label="Pause image slideshow">Pause</button><button class="scene-arrow" data-scene-prev aria-label="Previous scene">←</button><button class="scene-arrow" data-scene-next aria-label="Next scene">→</button></div></div>
        <span class="sr-only" role="status" aria-live="polite" data-scene-status></span>
      </div>
      <!-- HERO:end -->`;
}

function productContent(roast) {
  const product = CATALOG[roast];
  const level = product.roast.toLowerCase();
  const otherRoast = Object.keys(CATALOG).find(key => key !== roast);
  const other = CATALOG[otherRoast];
  const visual = getProductVisual(roast, '12oz');
  return `
    <section class="coffee-detail" id="coffee" aria-labelledby="product-title">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/#coffee">Coffee</a><span aria-hidden="true">/</span><span aria-current="page">${product.roast} roast</span></nav>
      <article class="product product-page" data-roast="${roast}" data-product-page>
        <div class="product-page-art"><div class="product-art ${level}-art"><span class="roast-label"><i></i> ${level.toUpperCase()} ROAST</span><img class="coffee-bag" data-product-image src="${visual.src}" alt="${escape(visual.alt)}" width="1024" height="1536" fetchpriority="high"></div><p class="packaging-note">Packaging concept.</p></div>
        <div class="product-page-copy"><p class="eyebrow">THE ${level.toUpperCase()} ROAST</p><h1 id="product-title">${product.name}.<br><em>${product.roast} roast coffee.</em></h1><p class="product-intro">${product.name} is our ${level} roast. Two bag sizes. One daily ritual.</p>
          <div class="product-title"><span class="product-price" data-price>$12<span>.00</span></span><span class="price-currency">USD</span></div>
          <fieldset class="size-options"><legend>Choose your bag</legend>${Object.entries(PRICES).map(([size, price]) => `<label><input type="radio" name="${roast}-size" value="${size}"${size === '12oz' ? ' checked' : ''}><span>${sizeLabel(size)} <small>$${price}</small></span></label>`).join('')}</fieldset>
          <div class="product-meta"><span data-size-helper>12 oz bag</span><span>5 lb · 10% less per ounce</span></div>
          <button class="button add-button" data-add="${roast}">Add to bag <span data-add-price>— $12</span><svg><use href="#arrow"/></svg></button>
          <p class="product-order-note">Zelle or cash transfer, confirmed by email. Shipping and any applicable tax are additional.</p>
          <a class="underlined-link related-roast" href="${productPath(otherRoast)}">Prefer ${other.roast.toLowerCase()}? ${other.name} ↗</a>
        </div>
      </article>
    </section>
    <section class="bag-sizes" aria-labelledby="bag-sizes-title"><div><p class="eyebrow">12 OZ OR 5 LB</p><h2 id="bag-sizes-title">Your coffee.<br><em>Your size.</em></h2></div><div class="bag-size-details"><p>Both bags contain the same ${level} roast coffee. The 5 lb bag is 80 oz, with 10% less cost per ounce.</p><div class="bag-size-grid">${Object.entries(PRICES).map(([size, price]) => `<a href="${productPath(roast)}?size=${size}#coffee"><strong>${sizeLabel(size)}</strong><span>$${price}</span><small>$${size === '5lb' ? '0.90' : '1.00'} / oz</small></a>`).join('')}</div></div></section>
`;
}

/** Generate static, readable product pages from the storefront's shared UI shell. */
export function renderSearchPages(template, options = {}) {
  const pages = new Map();
  const withGallery = template.replace(/<!-- HERO:start -->[\s\S]*?<!-- HERO:end -->/, () => renderHeroGallery());
  const home = replaceHead(withGallery, {
    title: 'Dark & Light Roast Coffee | Nectar Coffee Roasters',
    description: 'Explore Azoth dark roast and Infinite Luck light roast coffee. 12 oz bags for $12 or 5 lb bags for $72. Meet your daily coffee at Nectar Coffee Roasters.',
    graph: [{ '@type': 'ItemList', name: 'Our coffee', itemListElement: Object.keys(CATALOG).map((roast, index) => ({ '@type': 'ListItem', position: index + 1, name: `${CATALOG[roast].name} ${CATALOG[roast].roast.toLowerCase()} roast coffee`, url: SITE + productPath(roast) })) }],
  });
  pages.set('index.html', home);
  for (const [roast, product] of Object.entries(CATALOG)) {
    const pathname = productPath(roast);
    const level = product.roast.toLowerCase();
    let page = home.replace(/(<main id="main">)[\s\S]*?(?=    <section class="newsletter-section")/, (_match, openingMain) => openingMain + productContent(roast));
    page = page.replaceAll('href="#" aria-label="Nectar Coffee Roasters home"', 'href="/" aria-label="Nectar Coffee Roasters home"');
    page = page.replace('Browse our two roasts below.', 'Browse the coffee and bag sizes above.');
    page = replaceHead(page, {
      title: `${product.name} ${product.roast} Roast Coffee | Nectar`,
      description: `${product.name} ${level} roast coffee from Nectar Coffee Roasters. Choose a 12 oz bag for $12 or a 5 lb bag for $72. Zelle or cash transfer by email confirmation.`,
      pathname, image: getProductVisual(roast, '12oz').src, imageAlt: getProductVisual(roast, '12oz').alt,
      imageWidth: 1024, imageHeight: 1536, aboutId: `${SITE + pathname}#product`,
      graph: [productSchema(roast, options), { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Coffee', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: `${product.name} ${level} roast`, item: SITE + pathname }] }],
    });
    page = page.replace(`<link rel="preload" href="${HERO_IMAGE}" as="image">`, '');
    page = page.replace('  <script src="/carousel.js" type="module"></script>\n', '');
    pages.set(pathname.slice(1) + 'index.html', page);
  }
  let about = home.replace(/(<main id="main">)[\s\S]*?(?=    <section class="newsletter-section")/, (_match, openingMain) => openingMain + renderAboutContent() + '\n');
  about = about.replaceAll('href="#coffee"', 'href="/#coffee"');
  about = about.replaceAll('href="#" aria-label="Nectar Coffee Roasters home"', 'href="/" aria-label="Nectar Coffee Roasters home"');
  about = about.replace(/    <section class="faq-section"[\s\S]*?<\/section>\n/, '');
  about = about.replace(`<link rel="preload" href="${HERO_IMAGE}" as="image">`, '');
  about = about.replace('  <script src="/carousel.js" type="module"></script>\n', '');
  about = about.replace('Browse our two roasts below.', 'Explore our coffee from the navigation above.');
  about = replaceHead(about, { title: ABOUT_TITLE, description: ABOUT_DESCRIPTION, pathname: '/about/', pageType: 'AboutPage', graph: [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE}/about/` }] }] });
  pages.set('about/index.html', about);
  pages.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/about/', ...Object.keys(CATALOG).map(productPath)].map(url => `  <url><loc>${SITE + url}</loc></url>`).join('\n')}\n</urlset>\n`);
  return pages;
}

export async function generateSearchPages() {
  const directory = path.join(root, 'public');
  const pages = renderSearchPages(await readFile(path.join(directory, 'index.html'), 'utf8'));
  for (const [name, content] of pages) {
    const destination = path.join(directory, name);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  console.log('Generated homepage metadata, two coffee pages, About page, and sitemap.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateSearchPages();
