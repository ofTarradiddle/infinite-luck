# Nectar crema edits — images 01–04

All four were edited independently with the built-in `image_gen.imagegen` tool in edit mode, one edit call per target, using `referenced_image_paths` and `transparent_background: false`. Each source was inspected using `view_image` before editing. The supplied images were edit targets, not style references. No API key or fallback CLI was used. Each returned image was emitted with `generatedImage(result)` and visually inspected.

Only the visible coffee surfaces were requested to change to natural golden hazelnut crema. On visual inspection the four distinct compositions, cups, architectural geometry, table materials and steam-to-fog connections remain consistent. Generative editing does not guarantee byte-identical pixels outside the liquid. Every final output is 1536 × 1024, opaque RGB. PNG results were copied as returned. WebPs were encoded at quality 90, method 6, with no crop, composite, color adjustment or creative image manipulation.

## 01-city-wakes

- Source edit target: `/Users/dbe/infinite-luck/nectar-coffee-roasters/public/assets/hero/01-city-wakes.webp`
- Returned PNG: `/private/tmp/nectar-crema-01-04/01-city-wakes.png`
- Optimized WebP: `/private/tmp/nectar-crema-01-04/01-city-wakes.webp`
- Dimensions: 1536 × 1024

Exact prompt:

```text
Use case: precise-object-edit
Asset type: photographic coffee website hero, image 01 "The city wakes".
Input image: The supplied file is the EDIT TARGET, not a style reference.
Edit only the visible liquid surface inside the existing ivory coffee cup. Replace its flat black coffee surface with beautiful, optically realistic golden hazelnut espresso crema: a thin natural crema layer with fine microbubbles, warm caramel marbling and subtle darker tiger flecks. The crema should clearly read as fresh coffee crema in this exact lighting and low viewing angle. Keep its surface ellipse, fill height and meniscus consistent with the existing cup.
Strict invariants: preserve the scene, camera, crop, architecture, skyline, dawn sky, table grain, droplets, steam-to-fog transformation, atmosphere, color grade, focus, shadows, cup shape, handle, ceramic material and rim completely unchanged. Do not add objects or change any area outside the coffee liquid. Keep the original 1536 x 1024 landscape dimensions and composition exactly.
Crema is coffee crema, not milk foam: no latte art, no milk, no white froth, no thick whipped cream, no mound, no spoon, no extra cup, no added text or logo. Opaque background.
```

## 02-through-window

- Source edit target: `/Users/dbe/infinite-luck/nectar-coffee-roasters/public/assets/hero/02-through-window.webp`
- Returned PNG: `/private/tmp/nectar-crema-01-04/02-through-window.png`
- Optimized WebP: `/private/tmp/nectar-crema-01-04/02-through-window.webp`
- Dimensions: 1536 × 1024

Exact prompt:

```text
Use case: precise-object-edit
Asset type: photographic coffee website hero, image 02 "Through the window".
Input image: The supplied file is the EDIT TARGET, not a style reference.
Change ONLY the visible coffee liquid inside the central stoneware cup. Replace its black surface with a fine, fresh golden hazelnut espresso crema, visibly attractive but natural: very small microbubbles, delicate uneven caramel and tawny marbling, a few subtle darker tiger flecks, and a believable thin meniscus along the inner rim. The crema should read clearly at this low camera angle and match the existing soft amber kitchen light and cool window reflections. Retain the exact coffee level and surface ellipse.
Preserve the entire remaining image unchanged: skyline buildings, fog, clouds, window mullions and sill, steam path and steam-to-city-fog connection, lamp, vase, bowl, walnut table, marble slab, droplets, reflections, light, shadows, color grade, camera, perspective, crop and focus. Keep the cup shape, handle, rim and ceramic material untouched. Do not add or remove objects. Original composition and dimensions must remain exactly 1536 x 1024 landscape.
This is coffee crema, not milk foam: no latte art, no white foam, no milk, no thick froth or whipped cream. No added text or logo. Opaque background.
```

## 03-river-steam

- Source edit target: `/Users/dbe/infinite-luck/nectar-coffee-roasters/public/assets/hero/03-river-steam.webp`
- Returned PNG: `/private/tmp/nectar-crema-01-04/03-river-steam.png`
- Optimized WebP: `/private/tmp/nectar-crema-01-04/03-river-steam.webp`
- Dimensions: 1536 × 1024

Exact prompt:

```text
Use case: precise-object-edit
Asset type: photographic coffee website hero, image 03 "A river of steam".
Input image: The supplied file is the EDIT TARGET, not a style reference.
Make a single precise change: replace ONLY the black liquid surface inside the existing dark ceramic coffee cup with a beautiful thin layer of realistic golden hazelnut espresso crema. Give it tiny natural microbubbles, delicate golden-caramel marbling, slightly darker tawny tiger flecks and a believable fine meniscus. The crema must be clearly visible inside the cup's original surface ellipse while matching the low camera angle, warm rim highlight and surrounding cool city light. Preserve its fill level.
Everything else must remain unchanged: the entire skyline, river, reflections, fog, exact S-shaped steam-to-river-mist transformation, clouds, camera viewpoint, crop, focus, color grade, rounded walnut table edge, wood grain, dew droplets, light direction and shadows. Preserve the cup's silhouette, handle, ceramic texture, highlights and rim exactly. Do not add or remove anything outside the coffee liquid. Retain the exact original 1536 x 1024 landscape dimensions.
This is natural coffee crema, never milk foam. No latte art, white froth, milk, whipped cream, thick foamy mound, utensil, extra object, text or logo. Opaque background.
```

## 04-blue-hour

- Source edit target: `/Users/dbe/infinite-luck/nectar-coffee-roasters/public/assets/hero/04-blue-hour.webp`
- Returned PNG: `/private/tmp/nectar-crema-01-04/04-blue-hour.png`
- Optimized WebP: `/private/tmp/nectar-crema-01-04/04-blue-hour.webp`
- Dimensions: 1536 × 1024

Exact prompt:

```text
Use case: precise-object-edit
Asset type: photographic coffee website hero, image 04 "The blue hour".
Input image: The supplied file is the EDIT TARGET, not a style reference.
Only edit the visible espresso surface inside the existing small ivory porcelain cup. Replace the dark central liquid and narrow old foam ring with an attractive, optically realistic thin golden hazelnut crema layer. Use delicate natural caramel marbling, very fine microbubbles and a few subtle darker tiger flecks. The crema must be clearly recognizable despite the small cup and dark blue-hour setting, with a restrained warm reflection matching the existing light. Keep the original fill height, low-angle ellipse and meniscus.
All other pixels and visual structures must remain as in the input: preserve the small cup's porcelain material, shape, rim, handle, matching saucer and their shadows; preserve table grain and dew, full skyline and exact tower geometry, fog bank and thin steam ribbon, atmosphere, color grade, camera angle, crop, focus, lighting and dark negative space. Do not change or add anything outside the espresso liquid. Retain exactly the original 1536 x 1024 landscape dimensions and composition.
Crema is fresh coffee crema, not dairy: no latte art, no milk, no white foam, no thick whipped froth, no mound, no new object, no text or logo. Opaque background.
```

