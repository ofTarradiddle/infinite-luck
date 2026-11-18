# Nectar symbol-only brand correction

Created with the **built-in imagegen edit tool**, one call per product/size. The original supplied brand mark was viewed and used as a reference. The coffee cup above the inverted-F-like horizontal bar is the graphical “of” symbol; no literal typed “oF” prefix belongs before Nectar.

Final assets (all 1024 × 1536 RGBA, WebP quality 92, alpha preserved):

- `public/assets/infinite-luck-12oz-mark.webp`
- `public/assets/infinite-luck-5lb-mark.webp`
- `public/assets/azoth-12oz-mark.webp`
- `public/assets/azoth-5lb-mark.webp`

The new images preserve the rectangular logo box, cup/inverted-F graphic, matte kraft-paper bags, cream sticker, roast names, and weights. The large wordmark now reads **Nectar** without a typed prefix. 12 oz remains a narrow retail pouch; 5 lb remains a substantially wider/deeper bulk pouch. No sun or moon illustration is present.

The Infinite Luck pair was visually inspected for the corrected wordmark and original symbol, exact product spelling, correct **12 OZ / 340 G** and **5 LB / 2.27 KG** weights, and clean transparency. All four outer corners have alpha 0. QA composites over the site's card colors show clean cutouts and subtle soft grounding shadows.

## Infinite Luck 12 oz final edit prompt

Use case: precise-object-edit, typography correction only.
Edit input image 1, the INFINITE LUCK 12 oz kraft paper coffee bag. Remove ONLY the small literal typed letters "oF" that sit immediately before the large word "Nectar". The main wordmark must now read exactly "Nectar", centered in the existing thin rectangular logo box.
Important brand meaning: input image 2 is the original brand logo reference. The coffee cup above the horizontal bar / inverted F with extra bars IS already the graphic "of" symbol. Keep that existing coffee cup + horizontal bar + left upstroke + three downward strokes on the right EXACTLY in place above Nectar. Do not remove or alter this graphical mark. Do NOT type "of", "oF", "OF" or "Of" anywhere.
Preserve EVERYTHING else exactly from image 1: the folded tan matte kraft-paper bag shape/material, paper folds and gussets, size and position on 1024x1536 canvas, lighting, faint contact shadow, cream sticker and subtle edges, black thin rectangular box, "COFFEE ROASTERS", "INFINITE LUCK", olive rule, "LIGHT ROAST", and exact weight "12 OZ / 340 G". No sun/moon/other artwork. No new design, no resized bag, no label changes beyond removing the typed prefix and centering Nectar. Keep genuinely transparent background and matching high resolution.

## Infinite Luck 5 lb final edit prompt

Use case: precise-object-edit, typography correction only.
Edit input image 1, the INFINITE LUCK 5 lb BULK kraft-paper coffee bag. Remove ONLY the small literal printed letters "oF" immediately before the large word "Nectar", leaving the main wordmark to read exactly "Nectar" centered in its current thin rectangular box.
Input image 2 is the original brand reference: the coffee cup above an inverted F-like bar with extra downward strokes IS the graphical "of" mark. Preserve this existing cup + horizontal bar + left short upward stroke + three downward strokes on the right EXACTLY above the word Nectar. Do not remove or reinterpret that graphic. There should be NO typed "oF", "of", "OF", "Of" anywhere on the sticker.
Preserve every other detail exactly: large/wide/deep 5 lb bag silhouette and size on the 1024x1536 canvas, tan matte kraft-paper material, folded top, side gussets, lighting, faint contact shadow, cream sticker, black rectangular border, original serif Nectar style, "COFFEE ROASTERS", "INFINITE LUCK", tiny olive rule, "LIGHT ROAST", and exact weight "5 LB / 2.27 KG". No sun/moon/extra artwork, no new text, no props. This must remain the bulk 5lb bag, not a smaller 12oz bag.
Only erase the literal prefix and center the remaining word Nectar; keep all artwork and packaging unchanged, including genuine transparent background.

## Azoth final edit prompts

See [asset-prompts-azoth-symbol.md](asset-prompts-azoth-symbol.md) for the matching Azoth correction prompts and validation notes.

