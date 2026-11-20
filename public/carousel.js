import { HERO_SLIDES, wrapSlide } from './hero-slides.js?v=personal-cups-v1';

/** Loads scenes on demand; never downloads ten full-size images on first paint. */
export function initCarousel(root) {
  if (!root) return;
  const frame = root.querySelector('[data-scene-frame]');
  const title = root.querySelector('[data-scene-title]');
  const count = root.querySelector('[data-scene-count]');
  const status = root.querySelector('[data-scene-status]');
  const dots = [...root.querySelectorAll('[data-scene]')];
  const play = root.querySelector('[data-scene-play]');
  const select = root.querySelector('[data-scene-select]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const loaded = new Map([[0, Promise.resolve(frame.querySelector('img'))]]);
  let current = 0;
  let destination = 0;
  let requested = 0;
  let playing = !motion.matches;
  let hovered = false;
  let focused = false;
  let visible = true;
  let timer;

  function updatePlay() {
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} image slideshow`);
    play.setAttribute('aria-pressed', String(playing));
  }
  function schedule() {
    clearTimeout(timer);
    if (!playing || hovered || focused || !visible || document.hidden) return;
    timer = setTimeout(() => {
      if (document.querySelector('dialog[open]')) { schedule(); return; }
      show(current + 1);
    }, 8000);
  }
  function load(index) {
    if (!loaded.has(index)) {
      loaded.set(index, new Promise((resolve, reject) => {
        const slide = HERO_SLIDES[index];
        const picture = new Image(slide.width, slide.height);
        picture.alt = slide.alt;
        picture.className = 'scene-image';
        picture.decoding = 'async';
        picture.fetchPriority = 'low';
        picture.onload = () => resolve(picture);
        picture.onerror = () => { loaded.delete(index); reject(new Error('This scene could not load. Please try again.')); };
        picture.src = slide.src;
      }));
    }
    return loaded.get(index);
  }
  async function show(index, manual = false) {
    const next = wrapSlide(index);
    destination = next;
    const request = ++requested;
    clearTimeout(timer);
    if (manual) { playing = false; updatePlay(); }
    if (next === current) { if (select) select.value = String(current); root.removeAttribute('aria-busy'); schedule(); return; }
    root.setAttribute('aria-busy', 'true');
    try {
      const picture = await load(next);
      if (request !== requested) return;
      frame.replaceChildren(picture);
      current = next;
      if (select) select.value = String(next);
      title.textContent = HERO_SLIDES[next].title;
      count.textContent = `${String(next + 1).padStart(2, '0')} / 10`;
      dots.forEach((dot, position) => dot.setAttribute('aria-pressed', String(position === next)));
      if (manual) status.textContent = `${next + 1} of 10. ${HERO_SLIDES[next].title}.`;
    } catch (error) {
      if (request === requested) { destination = current; if (select) select.value = String(current); status.textContent = error.message; playing = false; updatePlay(); }
    } finally {
      if (request === requested) { root.removeAttribute('aria-busy'); schedule(); }
    }
  }

  root.querySelector('[data-scene-prev]').addEventListener('click', () => show(destination - 1, true));
  root.querySelector('[data-scene-next]').addEventListener('click', () => show(destination + 1, true));
  dots.forEach((dot, index) => dot.addEventListener('click', () => show(index, true)));
  select?.addEventListener('change', () => show(Number(select.value), true));
  play.addEventListener('click', () => {
    playing = !playing;
    if (playing) { hovered = false; focused = false; }
    updatePlay(); schedule();
  });
  root.addEventListener('keydown', event => {
    if (event.target === select) return;
    let next;
    if (event.key === 'ArrowLeft') next = destination - 1;
    if (event.key === 'ArrowRight') next = destination + 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = HERO_SLIDES.length - 1;
    if (next === undefined) return;
    event.preventDefault(); show(next, true);
  });
  root.addEventListener('pointerenter', () => { hovered = true; schedule(); });
  root.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  root.addEventListener('focusin', () => { focused = true; schedule(); });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) { focused = false; schedule(); } });
  let touchStart;
  frame.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
  });
  frame.addEventListener('pointerup', event => {
    if (!touchStart || event.pointerType !== 'touch') return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(destination + (dx < 0 ? 1 : -1), true);
  });
  frame.addEventListener('pointercancel', () => { touchStart = null; });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { if (motion.matches) { playing = false; updatePlay(); schedule(); } });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.25 }).observe(root);
  }
  root.querySelector('[data-scene-controls]').hidden = false;
  updatePlay(); schedule();
}

if (typeof document !== 'undefined') initCarousel(document.querySelector('[data-carousel]'));
