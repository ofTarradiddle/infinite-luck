/** Ten owner-supplied city mornings featuring their red and black-and-white patterned cups. */
export const HERO_SLIDES = Object.freeze([
  { id: '01-city-wakes', title: 'The city wakes', alt: 'Coffee in a red-patterned cream mug on a dew-covered oak table, with steam drifting into a misty New York skyline at sunrise.' },
  { id: '02-through-window', title: 'Through the window', alt: 'A red-patterned coffee mug on a dark wooden counter by a window, its steam joining the fog over New York at dawn.' },
  { id: '03-river-steam', title: 'A river of steam', alt: 'A red-patterned coffee mug on a rain-damp table, with steam winding into fog above the river and New York skyline.' },
  { id: '04-blue-hour', title: 'The blue hour', alt: 'Steam rises from a red-patterned coffee mug and saucer toward a blue New York skyline in a deep predawn haze.' },
  { id: '05-rain-on-glass', title: 'Rain on glass', alt: 'A red-patterned coffee mug and saucer on a kitchen table beneath a rain-streaked window and foggy New York skyline.' },
  { id: '06-brooklyn-morning', title: 'A Brooklyn morning', alt: 'Coffee in a black-and-white patterned mug and saucer on an oak kitchen table, with steam rising toward foggy New York through a window.' },
  { id: '07-last-light', title: 'The last light', alt: 'A black-and-white patterned coffee mug and saucer on a dark wooden counter, with drifting steam and a blue New York skyline through tall windows.' },
  { id: '08-quiet-geometry', title: 'Quiet geometry', alt: 'A black-and-white patterned coffee mug on a pale stone table, with rising steam and a misty New York skyline beyond.' },
  { id: '09-city-reflection', title: 'A city in the reflection', alt: 'A black-and-white patterned coffee mug on a dew-covered steel and wood table, its steam blending into fog over New York at dawn.' },
  { id: '10-before-rush', title: 'Before the rush', alt: 'A black-and-white patterned coffee mug on a warm oak kitchen table with a chair, beneath a fog-softened New York skyline.' },
].map(slide => Object.freeze({ ...slide, src: `/assets/hero/${slide.id}.webp?v=personal-cups-v1`, width: 1536, height: 1024 })));

export function wrapSlide(index, count = HERO_SLIDES.length) {
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(count) || count < 1) throw new RangeError('Choose a valid scene.');
  const remainder = index % count;
  return remainder < 0 ? remainder + count : (remainder || 0);
}
