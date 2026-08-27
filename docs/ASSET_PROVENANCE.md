# SolarMatch Thailand visual-asset provenance

Last audited: **2026-08-28**

This register records the provenance and rights basis of every visual asset intentionally used by the public prototype. It does not claim that copyright does not exist. It records why each asset may be used and any remaining limitation.

## Project image files

| Path | Purpose | Provenance and rights basis | Served | Attribution | Limitation |
| --- | --- | --- | --- | --- | --- |
| `public/images/solar-home-ai-1440.webp` | Large responsive homepage hero | Generated specifically for SolarMatch with OpenAI's built-in ImageGen tool on 2026-08-28, without input or reference images. SHA-256: `F6EDD261BB1DCC7788AE5D950757C661350FE6EF0E922F99A671AB24A95DD381`. | Local | None required | Synthetic illustration, not evidence of a customer, property, installation, or engineering outcome. |
| `public/images/solar-home-ai-768.webp` | Small responsive homepage hero | Downscaled WebP derivative of the same project-specific ImageGen output. SHA-256: `A09EE71BF0364CFB61406BE390AE4CA8120D05698041D469B4FB5938DD5E9DC4`. | Local | None required | Same synthetic-image boundary as the large version. |
| `public/og.png` | Open Graph/social preview | Generated specifically for the initial SolarMatch project with OpenAI ImageGen and introduced in repository commit `04e1629`. SHA-256: `0CCB9057587CB206DC260A9AE7E23B3298D4C3F23613D56141F3BD8B369DF36D`. | Local | None required | Photorealistic synthetic scene. The original full prompt was not retained in the repository; task history records that no third-party reference image was supplied. |
| `public/favicon.svg` | Browser favicon | Original code-native mark created for this project on 2026-08-28 from the existing SolarMatch sun-and-roof brand motif. SHA-256: `7142282D8915D838468507D18C0D59D5F4FF1B46BF1767DAFCC9AE0C19A68AE1`. | Local | None required | Project branding only; no claim of trademark registration. |

### Homepage ImageGen prompt summary

- Use case: photorealistic-natural landing-page hero.
- Scene: a plausible modest contemporary Thai detached home in a tropical residential setting.
- Subject: physically plausible rooftop panels and mounting, with no people.
- Presentation: natural architectural photography, restrained colour grading, and responsive-crop breathing room.
- Exclusions: no input images, brands, logos, watermarks, readable text, copied property, identifiable people, artist imitation, vehicles, or claim of a real SolarMatch installation.
- Disclosure: both Thai and English captions identify the scene as AI-generated illustration.

## Project-created and code-native visuals

| Source | Purpose | Provenance and rights basis | Served | Attribution | Limitation |
| --- | --- | --- | --- | --- | --- |
| `components/site/brand-mark.tsx` and associated rules in `app/globals.css` | SolarMatch wordmark and sun/roof symbol | Project-provided branding implemented with HTML and CSS. | Local code | None required | No claim of trademark registration or exclusivity. |
| CSS compositions in `app/globals.css` | Decorative roof, sun, energy, chart, gradient, and placeholder treatments | Original code-native layout and decoration created for this project. | Local code | None required | Decorative or illustrative only. |
| `components/home/home-page.tsx` sample bars | Example bill-comparison graphic | Original HTML/CSS data illustration. | Local code | None required | Values are explicitly labelled as interface examples, not household results. |
| `app/contact/page.tsx` and `components/pages/english-pages.tsx` QR placeholder | Reserved LINE integration area | Original code-native placeholder; it is not a functioning or copied QR code. | Local code | None required | No live LINE account is connected. |

## Open-source icons, charts, and fonts

| Package or family | Use | Licence and source | Served | Attribution |
| --- | --- | --- | --- | --- |
| `lucide-react` 1.34.0 | Interface icons rendered as inline SVG | ISC licence, with Feather-derived material under MIT. Licence text is distributed in `node_modules/lucide-react/LICENSE`; project source: <https://github.com/lucide-icons/lucide>. | Generated locally at runtime/build | No in-product attribution required by the applicable licences. |
| `recharts` 3.10.1 | Savings and lifetime-cost charts rendered as SVG | MIT licence in `node_modules/recharts/LICENSE`; project source: <https://github.com/recharts/recharts>. | Generated locally at runtime/build | No in-product attribution required; retain licence notices with redistributed source/package material. |
| Anuphan | Thai/Latin interface font | SIL Open Font License 1.1: <https://github.com/google/fonts/blob/main/ofl/anuphan/OFL.txt>. | Downloaded by the build and served locally | No visible attribution required; OFL terms apply to redistributed font files. |
| Noto Sans Thai | Thai/Latin body font | SIL Open Font License 1.1: <https://github.com/google/fonts/blob/main/ofl/notosansthai/OFL.txt>. | Downloaded by the build and served locally | No visible attribution required; OFL terms apply to redistributed font files. |
| Manrope | Latin/numeric display font | SIL Open Font License 1.1: <https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt>. | Downloaded by the build and served locally | No visible attribution required; OFL terms apply to redistributed font files. |

The build-generated font files appear under `.vinext/fonts/` and the deployment output. The public pages do not hotlink Google Fonts.

## Removed asset

`public/images/solar-home-hero.jpg` was a locally stored Pexels photograph credited to Robert So. It was removed on 2026-08-28 so that the deployed website no longer relies on third-party stock photography. It must not be restored without a deliberate provenance and product-authenticity review.

## Remote visual-asset check

The 2026-08-28 audit found no runtime-hotlinked image, remote CSS background, remote SVG, video, iframe, canvas image source, base64 visual, CDN image, stock-photo URL, manifest image, or remotely served logo. External URLs in Methodology and Resources are documentary source links, not visual assets loaded into SolarMatch pages.

Generated copies under `dist/client/` are deployment output, not separate source assets. Re-run this audit whenever a public image, icon package, font, social card, manifest, or remote media reference changes.
