import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SITE, renderSearchPages, productSchema } from '../scripts/generate-seo.mjs';
import { CATALOG, PRICES } from '../public/cart.js';
import { productPath, requestedSize } from '../public/product-links.js';
import { getProductVisual } from '../public/product-visuals.js';
import { PURCHASE_EMAIL } from '../public/store-config.js';
import { validPurchaseEmail } from '../public/order-request.js';

const publicDirectory = new URL('../public/', import.meta.url);
const template = await readFile(new URL('index.html', publicDirectory), 'utf8');
const generated = renderSearchPages(template);
const pageFile = pathname => pathname === '/' ? 'index.html' : `${pathname.slice(1)}index.html`;

function elements(html) {
  return [...html.matchAll(/<([a-z][a-z0-9:-]*)\b([^>]*?)>/gi)].map(match => {
    const attributes = Object.fromEntries([...match[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(attribute => [attribute[1].toLowerCase(), attribute[2] ?? attribute[3]]));
    return { tag: match[1].toLowerCase(), attributes };
  });
}

function schemaGraph(html) {
  const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'one initial-HTML structured-data block');
  return JSON.parse(blocks[0][1])['@graph'];
}

function assertNoUnconfirmedClaims(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(['availability', 'aggregateRating', 'review', 'ratingValue'].includes(key), false, `unconfirmed ${key}`);
    assertNoUnconfirmedClaims(nested);
  }
}

test('SEO generation is deterministic and checked-in pages match their current source', async () => {
  assert.deepEqual([...renderSearchPages(template)], [...generated]);
  assert.deepEqual([...renderSearchPages(generated.get('index.html'))], [...generated]);
  for (const [filename, content] of generated) {
    assert.equal(await readFile(new URL(filename, publicDirectory), 'utf8'), content, `${filename} needs regeneration`);
  }
});

test('home, About and product routes are emitted and the sitemap covers exactly the canonical pages', () => {
  assert.deepEqual(new Set(generated.keys()), new Set([
    'index.html', 'about/index.html', 'coffee/infinite-luck-light-roast/index.html', 'coffee/azoth-dark-roast/index.html', 'sitemap.xml',
  ]));
  const sitemap = generated.get('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const expected = ['/', '/about/', ...Object.keys(CATALOG).map(productPath)].map(pathname => SITE + pathname);
  assert.deepEqual(new Set(urls), new Set(expected));
  assert.equal(urls.length, expected.length);
  for (const href of urls) assert.equal(generated.has(pageFile(new URL(href).pathname)), true, href);
});

test('each page has one distinct self-canonical, matching social URL, title and H1', () => {
  const canonicals = new Set();
  const titles = new Set();
  for (const [filename, html] of generated) {
    if (!filename.endsWith('.html')) continue;
    const expected = SITE + (filename === 'index.html' ? '/' : '/' + filename.replace(/index\.html$/, ''));
    const nodes = elements(html);
    const canonical = nodes.filter(node => node.tag === 'link' && node.attributes.rel === 'canonical');
    assert.equal(canonical.length, 1, filename);
    assert.equal(canonical[0].attributes.href, expected);
    const socialUrl = nodes.find(node => node.tag === 'meta' && node.attributes.property === 'og:url');
    assert.equal(socialUrl?.attributes.content, expected);
    assert.equal(nodes.filter(node => node.tag === 'h1').length, 1, filename);
    assert.equal(nodes.filter(node => node.tag === 'main').length, 1, filename);
    const title = [...html.matchAll(/<title>([^<]+)<\/title>/g)];
    assert.equal(title.length, 1, filename);
    titles.add(title[0][1]);
    canonicals.add(canonical[0].attributes.href);
  }
  assert.equal(canonicals.size, 4);
  assert.equal(titles.size, 4);
});

test('home and related-roast anchors expose real product URLs, with no broken internal page or fragment links', () => {
  const homeLinks = elements(generated.get('index.html')).filter(node => node.tag === 'a').map(node => node.attributes.href);
  for (const roast of Object.keys(CATALOG)) assert.equal(homeLinks.includes(productPath(roast)), true, roast);
  for (const [filename, html] of generated) {
    if (!filename.endsWith('.html')) continue;
    const currentUrl = new URL(filename === 'index.html' ? '/' : '/' + filename.replace(/index\.html$/, ''), SITE);
    const links = elements(html).filter(node => node.tag === 'a' && node.attributes.href);
    for (const link of links) {
      const url = new URL(link.attributes.href.replaceAll('&amp;', '&'), currentUrl);
      if (url.origin !== SITE) continue;
      const target = generated.get(pageFile(url.pathname));
      assert.equal(typeof target, 'string', `${filename}: ${link.attributes.href}`);
      if (url.hash.length > 1) {
        const ids = elements(target).map(node => node.attributes.id).filter(Boolean);
        assert.equal(ids.includes(decodeURIComponent(url.hash.slice(1))), true, `${filename}: ${link.attributes.href}`);
      }
    }
    if (filename.startsWith('coffee/')) {
      const other = Object.keys(CATALOG).find(roast => !filename.includes(roast));
      assert.equal(links.some(node => node.attributes.href === productPath(other)), true, filename);
    }
  }
});

test('About is a distinct organization page with breadcrumbs and no product or offer schema', () => {
  for (const pages of [generated, renderSearchPages(template, { orderingEnabled: true })]) {
    const html = pages.get('about/index.html');
    const graph = schemaGraph(html);
    const about = graph.find(node => node['@type'] === 'AboutPage');
    const organization = graph.find(node => node['@type'] === 'Organization');
    const website = graph.find(node => node['@type'] === 'WebSite');
    assert.ok(about);
    assert.ok(organization);
    assert.ok(website);
    assert.equal(about.url, `${SITE}/about/`);
    assert.equal(about.about['@id'], organization['@id']);
    assert.equal(about.isPartOf['@id'], website['@id']);
    assert.equal(about.about['@id'].endsWith('#product'), false);
    const breadcrumbs = graph.find(node => node['@type'] === 'BreadcrumbList');
    assert.equal(breadcrumbs?.itemListElement.at(-1).item, `${SITE}/about/`);
    assert.doesNotMatch(JSON.stringify(graph), /"@type":"(?:Product|ProductGroup|Offer|AggregateOffer)"/);
    assertNoUnconfirmedClaims(graph);
  }
});

test('main, footer and mobile navigation link to the crawlable About page on every page', () => {
  const navigationLabels = ['Main navigation', 'Footer navigation', 'Mobile navigation'];
  for (const [filename, html] of generated) {
    if (!filename.endsWith('.html')) continue;
    const navs = [...html.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)].map(match => ({
      label: elements(`<nav${match[1]}>`)[0].attributes['aria-label'],
      links: elements(match[2]).filter(node => node.tag === 'a'),
    }));
    for (const label of navigationLabels) {
      const nav = navs.find(node => node.label === label);
      assert.ok(nav, `${filename}: ${label}`);
      assert.equal(nav.links.some(node => node.attributes.href === '/about/'), true, `${filename}: ${label}`);
    }
  }
});

test('initial product schema has the exact catalog variants, sizes and images without invented stock or ratings', () => {
  for (const [roast, product] of Object.entries(CATALOG)) {
    const html = generated.get(pageFile(productPath(roast)));
    const group = schemaGraph(html).find(node => node['@type'] === 'ProductGroup');
    assert.equal(group.productGroupID, roast);
    assert.equal(group.url, SITE + productPath(roast));
    assert.deepEqual(group.variesBy, ['https://schema.org/size']);
    assert.equal(group.hasVariant.length, Object.keys(PRICES).length);
    const selectedPrice = html.match(/<span\b(?=[^>]*\bdata-price\b)[^>]*>([\s\S]*?)<\/span>/)?.[1];
    assert.equal(selectedPrice?.replace(/<[^>]*>/g, ''), '$12.00', `${roast}: visible default price`);
    const sizeChoices = [...html.matchAll(/<label><input\b([^>]*)><span>([\s\S]*?)<\/span><\/label>/g)]
      .map(match => ({ input: elements(`<input${match[1]}>`)[0].attributes, text: match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }))
      .filter(choice => choice.input.name === `${roast}-size`);
    for (const [size, price] of Object.entries(PRICES)) {
      const visual = getProductVisual(roast, size);
      const variant = group.hasVariant.find(value => value.size === visual.label);
      assert.ok(variant, `${roast} ${size}`);
      assert.equal(variant['@type'], 'Product');
      assert.equal(variant.url, `${SITE + productPath(roast)}?size=${size}`);
      assert.equal(variant.image, SITE + visual.src);
      assert.equal(variant.additionalProperty.value, `${product.roast} roast`);
      assert.equal(sizeChoices.find(choice => choice.input.value === size)?.text, `${visual.label} $${price}`, `${roast} ${size}: visible size price`);
    }
    assertNoUnconfirmedClaims(group);
  }
});

test('offers are withheld before ordering is configured, and explicit enabled offers use exact USD prices', () => {
  for (const roast of Object.keys(CATALOG)) {
    const disabled = productSchema(roast, { orderingEnabled: false });
    for (const variant of disabled.hasVariant) assert.equal(Object.hasOwn(variant, 'offers'), false);
    if (!validPurchaseEmail(PURCHASE_EMAIL)) {
      for (const variant of productSchema(roast).hasVariant) assert.equal(Object.hasOwn(variant, 'offers'), false);
    }
    const enabled = productSchema(roast, { orderingEnabled: true });
    for (const [size, price] of Object.entries(PRICES)) {
      const variant = enabled.hasVariant.find(value => value.size === getProductVisual(roast, size).label);
      assert.equal(variant.offers['@type'], 'Offer');
      assert.equal(variant.offers.priceCurrency, 'USD');
      assert.equal(variant.offers.price, price);
      assert.equal(variant.offers.url, variant.url);
    }
    assertNoUnconfirmedClaims(enabled);
  }
});

test('product routes and shared size queries reject unknown or polluted catalog keys', () => {
  assert.equal(productPath('azoth'), '/coffee/azoth-dark-roast/');
  assert.equal(productPath('infinite-luck'), '/coffee/infinite-luck-light-roast/');
  for (const roast of ['unknown', '__proto__', 'constructor', 'toString', '../azoth', '<script>', null, undefined, 1, ['azoth'], new String('azoth'), { toString: () => 'azoth' }]) {
    assert.throws(() => productPath(roast), RangeError);
  }
  assert.equal(requestedSize('?size=5lb'), '5lb');
  assert.equal(requestedSize('?size=12oz'), '12oz');
  assert.equal(requestedSize('?tracking=example&size=5lb'), '5lb');
  for (const search of ['', '?size=', '?size=1lb', '?size=__proto__', '?size=constructor', '?size=toString', '?size=5LB', '?size=%3Cscript%3E']) {
    assert.equal(requestedSize(search), '12oz');
  }
});

test('generated pages retain unique shared UI IDs and valid labels, ARIA controls and dialog references', () => {
  const appIds = [
    'cart-items', 'cart-total', 'cart-bottom', 'cart-error', 'checkout-button', 'checkout-status', 'toast',
    'try-both', 'detail-shop', 'detail-image', 'detail-title', 'detail-roast', 'detail-description',
    'purchase-form', 'purchase-name', 'purchase-location', 'purchase-summary', 'purchase-email-body',
    'purchase-email-button', 'purchase-email-status', 'purchase-back', 'copy-purchase-request',
    'newsletter-form', 'newsletter-email', 'newsletter-message', 'newsletter-website', 'clear-saved-bag',
  ];
  for (const [filename, html] of generated) {
    if (!filename.endsWith('.html')) continue;
    const nodes = elements(html);
    const withIds = nodes.filter(node => node.attributes.id);
    const ids = new Set(withIds.map(node => node.attributes.id));
    assert.equal(ids.size, withIds.length, `${filename}: duplicate IDs`);
    for (const id of appIds) assert.equal(ids.has(id), true, `${filename}: ${id}`);
    for (const node of nodes) {
      for (const attribute of ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls']) {
        for (const id of (node.attributes[attribute] || '').split(/\s+/).filter(Boolean)) {
          assert.equal(ids.has(id), true, `${filename}: ${attribute}=${id}`);
        }
      }
      if (node.attributes['data-open']) {
        const target = withIds.find(value => value.attributes.id === node.attributes['data-open']);
        assert.equal(target?.tag, 'dialog', `${filename}: ${node.attributes['data-open']}`);
      }
    }
    assert.equal(nodes.some(node => (node.attributes.class || '').split(/\s+/).includes('brew-tabs')), true, filename);
  }
});
