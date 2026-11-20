import { HERO_SLIDES } from '../public/hero-slides.js';

export const RYANS_PATH = '/ryans-cup/';
export const RYANS_TITLE = "Ryan’s Cup — Coffee Brewed in an 8 oz Cup | Nectar";
export const RYANS_DESCRIPTION = 'Make Ryan’s Cup: grind coffee between espresso and Turkish, brew it directly in an 8 fl oz cup, and let the grounds settle. A small, personal coffee ritual.';
export const RYANS_STEPS = Object.freeze([
  { name: 'Grind fine.', text: 'Choose a grind finer than espresso and coarser than Turkish. Grind for the cup you’re making.' },
  { name: 'Start in the cup.', text: 'Place the grounds directly in the bottom of an 8 fl oz cup. There is no separate brewing vessel.' },
  { name: 'Pour. Let it settle.', text: 'Pour in hot water, leaving room below the rim. The pour moves the grounds through the water. Let the cup rest as the grounds settle.' },
  { name: 'Sip slowly.', text: 'Once the cup is comfortable to drink, sip from above the settled grounds. Leave the sediment at the bottom.' },
]);

export function renderRyansContent() {
  const image = HERO_SLIDES[5];
  return `
    <section class="ryan-page-hero" aria-labelledby="ryan-title"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Ryan’s Cup</span></nav><div class="ryan-page-heading"><div><p class="eyebrow">THE SIGNATURE RITUAL</p><h1 id="ryan-title">Ryan’s <em>Cup.</em></h1></div><p>Fine grounds.<br> Hot water.<br> Your eight-ounce cup.</p></div><div class="ryan-page-image"><img src="${image.src}" alt="${image.alt}" width="1536" height="1024" fetchpriority="high"><span>Small cup. Freshly made. Yours.</span></div></section>
    <section class="ryan-introduction" aria-labelledby="ryan-intro-title"><h2 id="ryan-intro-title">A little cup.<br><em>More often.</em></h2><div><p>Ryan’s Cup is coffee brewed directly in the cup you drink from. Use an 8 fl oz cup and coffee ground between espresso and Turkish. The grounds stay in the cup throughout the brew.</p><p>Hot water sets the grounds in motion. As the cup rests, gravity helps them settle. It is an unfiltered immersion brew: no plunger, no paper, just a small cup made when you want it.</p></div></section>
    <section class="ryan-instructions" aria-labelledby="ryan-steps-title"><div class="section-heading"><div><p class="eyebrow">HOW TO MAKE RYAN’S CUP</p><h2 id="ryan-steps-title">Grind. Pour.<br><em>Let it settle.</em></h2></div><p>Adjust the coffee dose to your taste. The eight ounces describe the cup’s capacity.</p></div><ol>${RYANS_STEPS.map((step, index) => `<li><span class="step-number">0${index + 1}</span><div><h3>${step.name}</h3><p>${step.text}</p></div></li>`).join('')}</ol></section>
    <section class="ryan-notes" aria-labelledby="ryan-notes-title"><div><p class="eyebrow">THE DETAILS</p><h2 id="ryan-notes-title">A ritual,<br><em>made personal.</em></h2></div><div class="faq-list"><details><summary>How fine should I grind?<span>+</span></summary><p>Between espresso and Turkish: finer than a typical espresso grind, without going all the way to the powder-like Turkish end. Grinders vary, so adjust yours by how the cup drinks.</p></details><details><summary>What happens to the grounds?<span>+</span></summary><p>They stay in the cup. Give them time to settle, sip gently, and leave the sediment at the bottom. This method uses immersion and settling rather than a filter.</p></details><details><summary>How much water goes in?<span>+</span></summary><p>Use an 8 fl oz cup and leave space beneath the rim for the coffee grounds and the pour. Eight ounces is the cup size, not a fixed water dose.</p></details><details><summary>Which roast can I use?<span>+</span></summary><p>Choose Infinite Luck for our light roast or Azoth for our dark roast. Both are available in 12 oz and 5 lb bags.</p></details></div></section>
    <section class="ryan-shop"><p class="eyebrow">MAKE IT YOUR CUP</p><h2>Start with <em>your roast.</em></h2><div><a class="button button-primary" href="/coffee/infinite-luck-light-roast/">Infinite Luck · light ↗</a><a class="button button-outline" href="/coffee/azoth-dark-roast/">Azoth · dark ↗</a></div></section>
`;
}
