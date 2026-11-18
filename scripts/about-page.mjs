import { HERO_SLIDES } from '../public/hero-slides.js';

export const ABOUT_TITLE = 'About — A love that stayed. | Nectar Coffee Roasters';
export const ABOUT_DESCRIPTION = 'From Disney to Starbucks to a large bank in New York City: the founder’s story and the personal coffee ritual behind Nectar Coffee Roasters.';

/** Editorial content only; the generator supplies the shared page shell. */
export function renderAboutContent() {
  return `
    <section class="about-page-hero" aria-labelledby="about-page-title">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">About</span></nav>
      <div class="about-page-heading">
        <p class="eyebrow">ABOUT</p>
        <h1 id="about-page-title">A love that <em>stayed.</em></h1>
        <p class="about-page-intro">Disney. Starbucks. New York City.</p>
      </div>
      <svg class="about-page-key" aria-hidden="true"><use href="#nectar-key"/></svg>
    </section>
    <figure class="founder-morning"><img src="${HERO_SLIDES[6].src}" alt="An imagined New York morning with a crema-topped coffee cup beneath the city skyline" width="1536" height="1024" loading="lazy"><figcaption>A city in motion. A moment in a cup.</figcaption></figure>
    <section class="about-page-story" aria-labelledby="about-page-story-title">
      <div class="about-page-story-heading"><p class="eyebrow">A NOTE FROM THE FOUNDER</p><h2 id="about-page-story-title">Coffee, <em>through it all.</em></h2></div>
      <div class="about-page-story-copy">
        <p>I fell in love with coffee while working at Disney. Then came Starbucks, and coffee became part of my working life in another way.</p>
        <p>Today, I work at a large bank in New York City. I still drink coffee throughout the day. The places have changed; the cup has stayed with me.</p>
        <p>This company comes from that personal connection. Your coffee should fit your day, your cup, and the way you like to make it.</p>
        <a class="button button-lime" href="/#coffee">Find your coffee <svg aria-hidden="true"><use href="#arrow"/></svg></a>
      </div>
    </section>
    <section class="founder-journey" aria-label="The founder’s journey"><div><span>01</span><h3>Disney</h3><p>Where the love of coffee began.</p></div><div><span>02</span><h3>Starbucks</h3><p>A new place. The same daily cup.</p></div><div><span>03</span><h3>New York City</h3><p>A large bank. Coffee through the day.</p></div></section>`;
}
