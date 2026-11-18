import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { HERO_SLIDES, wrapSlide } from '../public/hero-slides.js';
// Import before installing test globals, so the module's browser auto-init cannot run.
import { initCarousel } from '../public/carousel.js';

function webpDimensions(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length);
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    assert.ok(data + length <= bytes.length, 'WebP chunk fits the file');
    if (type === 'VP8X') return [bytes.readUIntLE(data + 4, 3) + 1, bytes.readUIntLE(data + 7, 3) + 1];
    if (type === 'VP8 ') {
      assert.deepEqual([...bytes.subarray(data + 3, data + 6)], [0x9d, 0x01, 0x2a]);
      return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff];
    }
    if (type === 'VP8L') {
      assert.equal(bytes[data], 0x2f);
      const bits = bytes.readUInt32LE(data + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = data + length + (length % 2);
  }
  assert.fail('WebP image dimensions are present');
}

test('ten immutable scenes point to distinct valid full-size WebPs and original PNGs', async () => {
  assert.equal(HERO_SLIDES.length, 10);
  assert.ok(Object.isFrozen(HERO_SLIDES));
  const ids = new Set();
  const webpHashes = new Set();
  const pngHashes = new Set();
  for (const slide of HERO_SLIDES) {
    assert.ok(Object.isFrozen(slide));
    assert.match(slide.id, /^\d{2}-[a-z]+(?:-[a-z]+)*$/);
    assert.equal(slide.src, `/assets/hero/${slide.id}.webp`);
    assert.ok(slide.title.trim().length > 4);
    assert.match(slide.alt, /coffee|cup/i);
    assert.doesNotMatch(slide.alt, /[<>]/);
    assert.deepEqual([slide.width, slide.height], [1536, 1024]);
    const [webp, png] = await Promise.all([
      readFile(new URL(`../public${slide.src}`, import.meta.url)),
      readFile(new URL(`../design-assets/hero-series/${slide.id}.png`, import.meta.url)),
    ]);
    assert.deepEqual(webpDimensions(webp), [1536, 1024], slide.id);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.toString('ascii', 12, 16), 'IHDR');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1536, 1024], slide.id);
    ids.add(slide.id);
    webpHashes.add(createHash('sha256').update(webp).digest('hex'));
    pngHashes.add(createHash('sha256').update(png).digest('hex'));
  }
  assert.equal(ids.size, 10);
  assert.equal(webpHashes.size, 10, 'all ten optimized scenes are different images');
  assert.equal(pngHashes.size, 10, 'all ten original generations are different images');
});

test('wrapping handles boundaries and safe integers without accepting coercible or polluted inputs', () => {
  for (const [index, expected] of [[0, 0], [9, 9], [10, 0], [11, 1], [-1, 9], [-10, 0], [-11, 9], [Number.MAX_SAFE_INTEGER, 1], [Number.MIN_SAFE_INTEGER, 9]]) assert.equal(wrapSlide(index), expected);
  assert.equal(wrapSlide(123, 1), 0);
  assert.equal(wrapSlide(-123, 1), 0);
  assert.equal(wrapSlide(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER - 1);
  const bad = [NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', null, undefined, true, [], {}, '__proto__', { valueOf: () => 1 }];
  for (const value of bad) assert.throws(() => wrapSlide(value), RangeError);
  for (const count of [0, -1, 1.5, NaN, Infinity, '10', null, {}, [], Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => wrapSlide(1, count), RangeError);
});

class SceneElement extends EventTarget {
  constructor() { super(); this.attributes = new Map(); this.children = []; this.textContent = ''; this.hidden = false; this.selectors = new Map(); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector(selector) { return selector === 'img' ? this.children[0] ?? null : this.selectors.get(selector) ?? null; }
  querySelectorAll(selector) { return selector === '[data-scene]' ? this.dots ?? [] : []; }
  replaceChildren(...children) { this.children = children; }
  contains(node) { return node === this || this.children.some(child => child.contains?.(node)); }
  click() { this.dispatchEvent(new Event('click')); }
}

function fixture(t, { reducedMotion = false } = {}) {
  const root = new SceneElement();
  const elements = {};
  for (const name of ['frame', 'title', 'count', 'status', 'play', 'prev', 'next', 'controls', 'select']) {
    elements[name] = new SceneElement();
    root.selectors.set(`[data-scene-${name}]`, elements[name]);
  }
  root.dots = Array.from({ length: HERO_SLIDES.length }, (_, index) => {
    const dot = new SceneElement(); dot.setAttribute('aria-pressed', String(index === 0)); return dot;
  });
  root.children = [...Object.values(elements), ...root.dots];
  const initial = new SceneElement(); initial.src = HERO_SLIDES[0].src;
  elements.frame.replaceChildren(initial);
  elements.title.textContent = HERO_SLIDES[0].title;
  elements.count.textContent = '01 / 10';
  elements.controls.hidden = true;
  elements.select.value = '0';
  const images = [];
  class SceneImage extends SceneElement {
    constructor(width, height) { super(); this.width = width; this.height = height; }
    set src(value) { this.source = value; images.push(this); }
    get src() { return this.source; }
    resolve() { this.onload(); }
    fail() { this.onerror(); }
  }
  const document = new EventTarget(); document.hidden = false; document.querySelector = () => null;
  const motion = new EventTarget(); motion.matches = reducedMotion;
  let now = 0; let timerId = 0;
  const tasks = new Map();
  const replacements = {
    document, window: {}, Image: SceneImage, matchMedia: () => motion,
    setTimeout: (callback, delay = 0) => { const id = ++timerId; tasks.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: id => tasks.delete(id),
  };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => {
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  });
  const advance = milliseconds => {
    const end = now + milliseconds;
    while (true) {
      const next = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, task] = next; tasks.delete(id); now = task.at; task.callback();
    }
    now = end;
  };
  initCarousel(root);
  return { root, ...elements, initial, images, tasks, motion, document, advance };
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
function key(root, value, target) {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value });
  // EventTarget does not bubble. Supply the child target when exercising the root listener.
  if (target) Object.defineProperty(event, 'target', { value: target });
  root.dispatchEvent(event);
  return event;
}
function pointer(target, type, x = 0, y = 0, pointerType = 'touch') {
  const event = new Event(type);
  for (const [name, value] of Object.entries({ clientX: x, clientY: y, pointerType })) Object.defineProperty(event, name, { value });
  target.dispatchEvent(event);
}

test('carousel initially uses its existing image and loads only requested scenes; next, previous and dots work', async t => {
  const f = fixture(t);
  assert.equal(f.images.length, 0, 'initialization must not eagerly download the ten scenes');
  assert.equal(f.controls.hidden, false);
  f.next.click();
  assert.equal(f.images.length, 1);
  assert.equal(f.images[0].src, HERO_SLIDES[1].src);
  assert.equal(f.frame.children[0], f.initial, 'keep the existing image until the next one loads');
  f.images[0].resolve(); await settle();
  assert.equal(f.title.textContent, HERO_SLIDES[1].title);
  assert.equal(f.count.textContent, '02 / 10');
  assert.equal(f.root.dots[1].getAttribute('aria-pressed'), 'true');
  assert.equal(f.play.textContent, 'Play', 'manual navigation pauses autoplay');
  f.prev.click(); await settle();
  assert.equal(f.frame.children[0], f.initial, 'previous can reuse the original image');
  assert.equal(f.images.length, 1);
  f.root.dots[9].click(); f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '10 / 10');
  assert.match(f.status.textContent, /10 of 10/);
  f.next.click(); await settle();
  assert.equal(f.count.textContent, '01 / 10');
});

test('manual navigation stays paused until Play, and reduced-motion starts without autoplay', async t => {
  const f = fixture(t, { reducedMotion: true });
  assert.equal(f.play.textContent, 'Play');
  f.advance(32_000); assert.equal(f.images.length, 0);
  f.next.click(); f.images[0].resolve(); await settle();
  f.advance(16_000); assert.equal(f.images.length, 1);
  f.play.click(); assert.equal(f.play.textContent, 'Pause');
  f.advance(7_999); assert.equal(f.images.length, 1);
  f.advance(1); assert.equal(f.images.length, 2);
  f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '03 / 10');
  f.motion.matches = true; f.motion.dispatchEvent(new Event('change'));
  assert.equal(f.play.textContent, 'Play');
  f.advance(16_000); assert.equal(f.images.length, 2);
});

test('a failed image keeps the current scene, announces the error and can be retried', async t => {
  const f = fixture(t);
  f.root.dots[3].click(); f.images[0].fail(); await settle();
  assert.equal(f.frame.children[0], f.initial);
  assert.equal(f.count.textContent, '01 / 10');
  assert.match(f.status.textContent, /could not load/);
  assert.equal(f.play.textContent, 'Play');
  assert.equal(f.root.getAttribute('aria-busy'), null);
  f.root.dots[3].click(); assert.equal(f.images.length, 2);
  f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '04 / 10');
});

test('the newest requested scene wins when image loads resolve out of order', async t => {
  const f = fixture(t);
  f.root.dots[1].click();
  f.root.dots[2].click();
  f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '03 / 10');
  const selected = f.frame.children[0];
  f.images[0].resolve(); await settle();
  assert.equal(f.frame.children[0], selected);
  assert.equal(f.title.textContent, HERO_SLIDES[2].title);
  assert.equal(f.root.getAttribute('aria-busy'), null);
});

test('returning to the current scene cancels an in-flight transition and clears its busy state', async t => {
  const f = fixture(t);
  f.next.click(); assert.equal(f.root.getAttribute('aria-busy'), 'true');
  const event = key(f.root, 'Home');
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.root.getAttribute('aria-busy'), null);
  f.images[0].resolve(); await settle();
  assert.equal(f.frame.children[0], f.initial);
  assert.equal(f.count.textContent, '01 / 10');
  assert.equal(f.root.getAttribute('aria-busy'), null);
});

test('rapid next and previous clicks retain every navigation intent before images finish loading', async t => {
  const f = fixture(t);
  f.next.click(); f.next.click(); f.next.click();
  assert.deepEqual(f.images.map(image => image.src), [HERO_SLIDES[1].src, HERO_SLIDES[2].src, HERO_SLIDES[3].src]);
  assert.equal(f.frame.children[0], f.initial);
  f.images[2].resolve(); await settle();
  assert.equal(f.count.textContent, '04 / 10');
  f.images[0].resolve(); f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '04 / 10', 'older completed images cannot undo the final requested scene');
  f.prev.click(); f.prev.click(); await settle();
  assert.equal(f.count.textContent, '02 / 10', 'rapid previous clicks are counted even before cached images display');
  assert.equal(f.images.length, 3, 'previous navigation reuses the loaded scenes');
  assert.equal(f.play.textContent, 'Play');
});

test('horizontal touch swipes navigate in the expected direction and wrap at the first scene', async t => {
  const f = fixture(t);
  pointer(f.frame, 'pointerdown', 240, 200);
  pointer(f.frame, 'pointerup', 120, 208);
  assert.equal(f.images[0].src, HERO_SLIDES[1].src, 'swipe left advances');
  f.images[0].resolve(); await settle();
  assert.equal(f.count.textContent, '02 / 10');
  pointer(f.frame, 'pointerdown', 100, 200);
  pointer(f.frame, 'pointerup', 230, 208);
  await settle();
  assert.equal(f.count.textContent, '01 / 10', 'swipe right goes back');
  pointer(f.frame, 'pointerdown', 100, 200);
  pointer(f.frame, 'pointerup', 230, 208);
  assert.equal(f.images[1].src, HERO_SLIDES[9].src, 'swipe right from the first scene wraps to the last');
  f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '10 / 10');
  assert.equal(f.play.textContent, 'Play', 'swiping is manual navigation and pauses autoplay');
});

test('vertical scrolling, short gestures, mouse drags and cancelled touches never advance scenes', async t => {
  const f = fixture(t, { reducedMotion: true });
  for (const [dx, dy] of [[0, 180], [-100, 120], [-50, 0], [0, 0]]) {
    pointer(f.frame, 'pointerdown', 240, 200);
    pointer(f.frame, 'pointerup', 240 + dx, 200 + dy);
  }
  pointer(f.frame, 'pointerdown', 240, 200, 'mouse');
  pointer(f.frame, 'pointerup', 100, 200, 'mouse');
  pointer(f.frame, 'pointerdown', 240, 200);
  pointer(f.frame, 'pointercancel');
  pointer(f.frame, 'pointerup', 100, 200);
  await settle();
  assert.equal(f.images.length, 0);
  assert.equal(f.frame.children[0], f.initial);
  assert.equal(f.count.textContent, '01 / 10');
  assert.equal(f.root.getAttribute('aria-busy'), null);
});

test('scene selection navigates, follows other controls and resets to the displayed scene after failures or cancellation', async t => {
  const f = fixture(t);
  f.select.value = '4'; f.select.dispatchEvent(new Event('change'));
  assert.equal(f.images[0].src, HERO_SLIDES[4].src);
  f.images[0].resolve(); await settle();
  assert.equal(f.count.textContent, '05 / 10');
  assert.equal(f.select.value, '4');
  assert.equal(f.play.textContent, 'Play', 'selection is manual navigation');
  f.next.click(); f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '06 / 10');
  assert.equal(f.select.value, '5', 'the selector follows button navigation');
  const displayed = f.frame.children[0];
  f.select.value = '7'; f.select.dispatchEvent(new Event('change'));
  f.images[2].fail(); await settle();
  assert.equal(f.frame.children[0], displayed);
  assert.equal(f.select.value, '5', 'a failed selection returns to the scene that is actually visible');
  assert.match(f.status.textContent, /could not load/);
  f.next.click(); assert.equal(f.root.getAttribute('aria-busy'), 'true');
  f.select.value = '5'; f.select.dispatchEvent(new Event('change'));
  assert.equal(f.root.getAttribute('aria-busy'), null);
  f.images[3].resolve(); await settle();
  assert.equal(f.frame.children[0], displayed);
  assert.equal(f.select.value, '5', 'returning to the current option cancels the pending navigation');
});

test('native selector keys are not intercepted while carousel keyboard shortcuts still work elsewhere', async t => {
  const f = fixture(t);
  for (const value of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    assert.equal(key(f.root, value, f.select).defaultPrevented, false);
  }
  assert.equal(f.images.length, 0, 'selector key events must not trigger carousel downloads');
  assert.equal(f.count.textContent, '01 / 10');
  f.select.value = '2'; f.select.dispatchEvent(new Event('change'));
  f.images[0].resolve(); await settle();
  assert.equal(f.count.textContent, '03 / 10', 'the native selector change still navigates normally');
  assert.equal(key(f.root, 'End').defaultPrevented, true);
  f.images[1].resolve(); await settle();
  assert.equal(f.count.textContent, '10 / 10');
  assert.equal(f.select.value, '9');
});
