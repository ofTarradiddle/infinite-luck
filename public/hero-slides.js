/** Ten original, independently generated interpretations of coffee becoming a city morning. */
export const HERO_SLIDES = Object.freeze([
  { id: '01-city-wakes', title: 'The city wakes', alt: 'Steam from a crema-topped ivory cup on an oak kitchen table becomes the morning fog over a full-size city.' },
  { id: '02-through-window', title: 'Through the window', alt: 'A crema-topped coffee cup on a walnut kitchen table, its steam meeting city fog beyond a tall apartment window.' },
  { id: '03-river-steam', title: 'A river of steam', alt: 'Steam from a dark cup of coffee with golden crema curves into a fog-covered river beneath a city before sunrise.' },
  { id: '04-blue-hour', title: 'The blue hour', alt: 'A small ivory espresso cup topped with golden crema below a distant blue city, connected by a quiet ribbon of steam and fog.' },
  { id: '05-rain-on-glass', title: 'Rain on glass', alt: 'A speckled cup of coffee with golden crema on oak, with steam joining a rainy, foggy city through an apartment window.' },
  { id: '06-brooklyn-morning', title: 'A Brooklyn morning', alt: 'Crema-topped coffee on a brownstone kitchen table, its steam drifting toward rooftops and river fog before sunrise.' },
  { id: '07-last-light', title: 'The last light', alt: 'A warm cup of coffee with golden crema on walnut beneath a softly lit city skyline emerging through predawn mist.' },
  { id: '08-quiet-geometry', title: 'Quiet geometry', alt: 'An ivory cup of coffee with golden crema on pale stone, its steam rising toward a full-size city softened by predawn fog.' },
  { id: '09-city-reflection', title: 'A city in the reflection', alt: 'A dark cup of coffee with golden crema on dew-covered steel and walnut, with a distant city reflected where steam meets morning fog.' },
  { id: '10-before-rush', title: 'Before the rush', alt: 'A small cup of coffee with golden crema on a warm oak apartment table, overlooking layers of blue city rooftops before sunrise.' },
].map(slide => Object.freeze({ ...slide, src: `/assets/hero/${slide.id}.webp?v=crema-v3`, width: 1536, height: 1024 })));

export function wrapSlide(index, count = HERO_SLIDES.length) {
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(count) || count < 1) throw new RangeError('Choose a valid scene.');
  const remainder = index % count;
  return remainder < 0 ? remainder + count : (remainder || 0);
}
