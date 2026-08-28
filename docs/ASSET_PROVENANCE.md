# SolarMatch Thailand visual-asset provenance

Last audited: **2026-08-28**

This register records the provenance and rights basis of every visual asset intentionally used by the public prototype. It does not claim that copyright does not exist. It records why each asset may be used, how it was transformed, and any remaining limitation.

## Licensed photographic assets

The homepage photograph is **“Solar Panel on Roof of House in California, USA” by Kindel Media**:

- Source page: <https://www.pexels.com/photo/solar-panel-on-roof-of-house-in-california-usa-9875438/>
- Licence: Pexels Licence, checked 2026-08-28: <https://www.pexels.com/license/>
- Rights basis: Pexels permits free use and modification, including use on websites. Attribution is not required. The licence prohibits presenting identifiable people or brands in a bad light, implying endorsement, and redistributing an unaltered copy as stock. This project does none of those things.
- Download and processing: the original 4385×3289 JPEG was downloaded from Pexels on 2026-08-28. Only cropping, resizing, colour-preserving WebP encoding, and PNG palette optimisation were applied. The downloaded source file is not shipped or committed.
- Presentation boundary: the photograph is used as an illustrative residential-solar scene. It is not described as Thailand, a SolarMatch customer, a SolarMatch installation, or evidence of a household-specific engineering result.
- Delivery: all derivatives are served locally. The public site does not hotlink Pexels.

| Path | Purpose and transformation | SHA-256 | Attribution | Limitation |
| --- | --- | --- | --- | --- |
| `public/images/solar-home-real-1440.webp` | 1440×960 responsive homepage crop, WebP quality 84 | `63D1CFA09E02C5811E597002ADCCE8E43787797635CE8BFA704AF3A5F70FEBBF` | Not required; creator and source are documented above | Illustrative only; not a SolarMatch customer or verified Thai installation |
| `public/images/solar-home-real-768.webp` | 768×512 responsive homepage crop, WebP quality 82 | `4F4EBAD867F50712C1A86A9108A495B20AB9D9E51594D07284A2535F64024055` | Not required; creator and source are documented above | Same presentation boundary as the large derivative |
| `public/og.png` | 1200×630 social-preview crop with 256-colour PNG optimisation | `57721998CAEDEFE703AF68794D86669E0B7C442AC8474329DBA8BEA1907B37EA` | Not required; creator and source are documented above | Social preview only; it does not imply endorsement |

## Project branding and code-native visuals

| Source | Purpose | Provenance and rights basis | Served | Attribution | Limitation |
| --- | --- | --- | --- | --- | --- |
| `public/favicon.svg` | Browser favicon | Original code-native mark created for this project from the SolarMatch sun-and-roof motif. SHA-256: `7142282D8915D838468507D18C0D59D5F4FF1B46BF1767DAFCC9AE0C19A68AE1`. | Local | None required | Project branding only; no claim of trademark registration |
| `components/site/brand-mark.tsx` and associated rules in `app/globals.css` | SolarMatch wordmark and sun/roof symbol | Project-provided branding implemented with HTML and CSS | Local code | None required | No claim of trademark registration or exclusivity |
| CSS compositions in `app/globals.css` | Decorative roof, sun, energy, chart, gradient, and placeholder treatments | Original code-native layout and decoration created for this project | Local code | None required | Decorative or illustrative only |
| `components/home/home-page.tsx` sample bars | Example bill-comparison graphic | Original HTML/CSS data illustration | Local code | None required | Explicitly an interface example, not a household result |
| Contact-page QR placeholder | Reserved LINE integration area | Original code-native placeholder; it is not a functioning or copied QR code | Local code | None required | No live LINE account is connected |

## Open-source icons, charts, and fonts

| Package or family | Use | Licence and source | Served | Attribution |
| --- | --- | --- | --- | --- |
| `lucide-react` 1.34.0 | Interface icons rendered as inline SVG | ISC licence, with Feather-derived material under MIT. Licence text is distributed in `node_modules/lucide-react/LICENSE`; source: <https://github.com/lucide-icons/lucide>. | Generated locally at build/runtime | No in-product attribution required by the applicable licences |
| `recharts` 3.10.1 | Savings and lifetime-cost charts rendered as SVG | MIT licence in `node_modules/recharts/LICENSE`; source: <https://github.com/recharts/recharts>. | Generated locally at build/runtime | No in-product attribution required; retain licence notices with redistributed package material |
| `leaflet` 1.9.4 | Interactive address-confirmation map and controls | BSD-2-Clause licence in `node_modules/leaflet/LICENSE`; source: <https://github.com/Leaflet/Leaflet/blob/main/LICENSE>. | Local application package | Retain package licence notice |
| Anuphan | Thai/Latin interface font | SIL Open Font License 1.1: <https://github.com/google/fonts/blob/main/ofl/anuphan/OFL.txt> | Downloaded by the build and served locally | No visible attribution required; OFL terms apply |
| Noto Sans Thai | Thai/Latin body font | SIL Open Font License 1.1: <https://github.com/google/fonts/blob/main/ofl/notosansthai/OFL.txt> | Downloaded by the build and served locally | No visible attribution required; OFL terms apply |
| Manrope | Latin/numeric display font | SIL Open Font License 1.1: <https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt> | Downloaded by the build and served locally | No visible attribution required; OFL terms apply |

Build-generated font files appear under `.vinext/fonts/` and the deployment output. Public pages do not hotlink Google Fonts.

## Removed assets

- `public/images/solar-home-ai-1440.webp` and `public/images/solar-home-ai-768.webp` were project-generated synthetic illustrations. They were removed on 2026-08-28 when the site returned to clearly licensed real photography.
- `public/images/solar-home-hero.jpg` was an earlier Pexels photograph credited to Robert So. It remains removed and must not be restored without a fresh provenance and product-fit review.
- The former AI-generated `public/og.png` was replaced by the documented Kindel Media licensed crop.

## Remote map tiles

The address-confirmation step loads standard map tiles from `https://tile.openstreetmap.org/{z}/{x}/{y}.png` only after the user opens the map. Map data is © OpenStreetMap contributors and available under the Open Data Commons Open Database Licence; visible attribution links to <https://www.openstreetmap.org/copyright>. Tile use follows the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/). The site does not copy a proprietary basemap, scrape tiles, prefetch tiles, or claim ownership.

The 2026-08-28 audit otherwise found no runtime-hotlinked stock photograph, CSS background, remote SVG, video, iframe, base64 visual, CDN image, manifest image, or remotely served logo. External URLs in Methodology, Resources, and this register are documentary source links, not visual assets loaded into SolarMatch pages.

Generated copies under deployment output are not separate source assets. Re-run this audit whenever a public image, icon package, font, social card, manifest, or remote media reference changes.
