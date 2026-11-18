export const ABOUT_TITLE = 'About — A love that stayed. | Nectar Coffee Roasters';
export const ABOUT_DESCRIPTION = 'A love of coffee that began while working at Disney and continues through the working day at a large bank. Read the founder’s story.';

/** Editorial content only; the generator supplies the shared page shell. */
export function renderAboutContent() {
  return `
    <section class="about-page-hero" aria-labelledby="about-page-title">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">About</span></nav>
      <div class="about-page-heading">
        <p class="eyebrow">ABOUT</p>
        <h1 id="about-page-title">A love that <em>stayed.</em></h1>
        <p class="about-page-intro">Different days. The same love of coffee.</p>
      </div>
      <svg class="about-page-key" aria-hidden="true"><use href="#nectar-key"/></svg>
    </section>
    <section class="about-page-story" aria-labelledby="about-page-story-title">
      <div class="about-page-story-heading"><p class="eyebrow">A NOTE FROM THE FOUNDER</p><h2 id="about-page-story-title">Coffee, <em>through it all.</em></h2></div>
      <div class="about-page-story-copy">
        <p>I fell in love with coffee while I was working at Disney. Somewhere in the rhythm of those days, a cup became something I looked forward to.</p>
        <p>Today, I work at a large bank, and I drink coffee throughout the day. The setting has changed. The love of coffee has stayed.</p>
        <p>This company grows out of that simple affection. I want to make room for the cups that punctuate ordinary days: the first one, the next one, and the one that gives you a moment to pause.</p>
        <a class="button button-lime" href="/#coffee">Find your coffee <svg aria-hidden="true"><use href="#arrow"/></svg></a>
      </div>
    </section>`;
}
