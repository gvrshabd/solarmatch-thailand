# Terrace redesign — implementation and review report

## Delivery boundary

1. **Branch:** `redesign/terrace-cinematic-v1`.
2. **Main baseline:** `88c41b024f36e205ccfccb72ef7e68b7ef8adff2` (`Improve appliance inputs, district search, and branding`). Verified SolarMatch origin: `https://github.com/gvrshabd/solarmatch-thailand.git`.
3. **Public files changed:** `app/layout.tsx`, new `app/terrace.css`, `components/home/home-page.tsx`, `components/estimate/estimate-shell.tsx`, `components/results/savings-chart.tsx`, `components/results/lifetime-cost-chart.tsx`, `components/site/site-header.tsx`, new `components/site/public-design-shell.tsx`, new `components/site/terrace-photo.tsx`, and the two new `public/images/terrace-house-*.jpg` responsive images.
4. **Intentionally unchanged:** calculator formulas/types, question definitions/order/options/IDs, qualification/scoring, district data/search, bill-slider logic and limits, consent text/versioning, contact validation/submission, result calculations/disclaimer contents, legal text, public APIs, releases, admin components/API, D1, migrations, R2, Worker configuration, Access settings, secrets, production pipeline, official brand SVG geometry, and existing solar photographs/sketches. Anuphan weight400 is added to the already configured font family. The photographic sidebar is hidden outside the public design boundary, including existing admin previews.
5. **Design tokens:** Pine `#142D26`, Warm Stone `#F4F3ED`, Lime `#D6EF91`, Garden `#68816B`; secondary text `#536259`, rules `#CBD0C4`. See `../TERRACE_DESIGN.md` and `style-tile.html`.
6. **Homepage:** static licensed architectural hero; practical assurances; suitability introduction; three numbered steps; residential roof photo/estimate benefits; real bill starter; methodology/sources; existing FAQs; final CTA. Removed the illustrative numeric comparison bars, not any real calculator chart.
7. **Calculator:** wide desktop photo/form split; existing eleven one-question steps; 128–145px mobile photo masthead; same searchable district menu, eight-row limit, Thai sorting, installed-AC count, real slider, normal-flow navigation and form state.
8. **Results:** Pine hero, Lime net-savings emphasis, editorial metrics/rules, quieter chart/refinement/table surfaces; same authoritative results and disclaimers. Comparison curve gains a dash pattern. No numeric logic changed.
9. **Thai:** Anuphan throughout public surfaces, no Thai heading/eyebrow letterspacing, increased line height; English uses Manrope. No locked Thai/English strings edited.
10. **Mobile:** single-column content/forms; shallow assessment photo; normal-flow Back/Next; square, labeled controls; 44px Exit/menu controls; Escape/Close returns menu focus. No decorative parallax or tilt.
11. **Widths:** browser suite covers 320,360,375,384,390,393,402,412,414,430,432,768px; desktop Chromium/WebKit coverage plus 1440px visual captures. The requested 320/360/375/390/393/414/430/768 widths are all included.
12. **Safari-specific checks:** desktop WebKit and iPhone-profile mobile WebKit; slider track/thumb/labels/actions separation, focus, dropdowns, orientation/scrolling, consent/contact geometry, Thai wrapping, overflow and reduced motion. A separate Chromium390px smoke check with4× CPU throttling passed district search, double-click navigation protection, bill entry, Back navigation and district-state preservation. Physical iPhone Safari and hardware-level performance were not tested.

## Cinematic media — explicit outstanding work

13. **Image model:** installed Higgsfield `gpt_image_2` inspected and attempted once (2K, high, 16:9); rejected before a job/output was returned: `Requires basic plan or higher.`
14. **Video model:** installed `seedance_2_5` inspected/estimated, not generated. A 12s1080p estimate returned108 credits per clip; account balance was10. No purchase or account upgrade was made.
15. **Generated asset locations:** none; generation is blocked. No invented job IDs or outputs.
16. **Final desktop generated hero:** not yet created. Active stock placeholder is `public/images/terrace-house-1920.jpg`.
17. **Final mobile generated hero:** not yet created. Active responsive stock source is `public/images/terrace-house-768.jpg`; current mobile uses a temporary responsive crop, not a claimed cinematic recomposition.
18. **Source videos:** none.
19. **Manifest/storyboard:** `asset-manifest.json` and `cinematic-storyboard.md` in this directory. The manifest has null pending stills and empty video/frame lists. Six keyframes (A/B/C per format), connected clips, exact-last-frame continuity, original source masters, final posters and optional frame exports remain pending.
20. **Animation integration:** none. No video/canvas, frame sequence, animation preload, scroll scrub, wheel listener or pinning added.
21. **Static homepage:** only static locally served licensed photography. Visible credit; no claim that the stock house is a Bangkok home, SolarMatch customer or installer project.

## Verification

22. **Lint:** passed with project ESLint command, including the capture script.
23. **Typecheck:** passed (`tsc --noEmit`).
24. **Unit tests:**56 passed across9 files. The calculator, qualification, legal/contact and UI consistency tests remain intact.
25. **Browser tests:** final full run **95 passed,6 intentional skips,0 failures** (101 cases,5.7 minutes; `playwright test --workers=2`). This includes desktop Chromium/WebKit and mobile Chromium/WebKit, axe checks, real journeys, contact/consent fixtures and the complete narrow-width suite. Initial checks found a3px Thai Resources overflow at320px; the grid/source-link layout was corrected. One subsequent run had an intermittent WebKit414px exact slider-containment assertion; added a real2px bottom inset and replaced the fixed transition delay with an opacity/font readiness check. The final full run passes without disabling or loosening geometry assertions. Earlier result captures were also updated to wait for the existing loading/transition before contrast measurement. All axe assertions remain enabled. The6 skips are existing desktop-only checks omitted in the mobile project, not failed tests hidden by this task.
26. **Production build:** passed after final public-code edits. Used existing vinext/Vite/Cloudflare architecture, no dependencies added. Local Worker preview uses local D1/R2 only.
27. **Remaining blockers/limits:** Higgsfield plan/credits; Terrace study URL required ChatGPT authentication so the supplied detailed brief—not an inspected live study—guided the design. Cinematic media needs generation and acceptance. No authenticated production smoke test or deployment was performed because production changes are explicitly excluded. Existing business/legal configuration and collection safeguards remain as before, not certified or altered by this design task.
28. **Preview:** `http://127.0.0.1:3000/en` and `http://127.0.0.1:3000/`; estimator at `/en/estimate` or `/estimate`. Complete it and choose No for the real loading/result path. Reproducible screenshot script: `node scripts/capture-terrace-review.mjs`; outputs the sibling `outputs/solarmatch-terrace-review` directory. The local contact screenshot fixture blocks every submission and writes no operational configuration. The preview can be restarted using instructions in `../TERRACE_DESIGN.md`.
29. **Main/deployment:** no merge, remote push, production deploy, database migration or resource creation. Design is committed locally on its review branch after verification. Approval is required before merging/deploying; first review the static design, resolve/approve the hero-media placeholder, incorporate any later legitimate main work safely without rewriting history, rerun checks, then use the existing pipeline only. Animation requires separate explicit approval even after static-design approval.
30. **Milly’s:** no file, repository, Worker, database, bucket, Access application or other Milly’s resource was targeted or changed.

## Supporting files

Updated `docs/ASSET_PROVENANCE.md`. Added `docs/TERRACE_DESIGN.md`, this report, `style-tile.html`, `cinematic-storyboard.md`, `asset-manifest.json`, and `scripts/capture-terrace-review.mjs`. Updated `playwright.config.ts`, `tests/e2e/site.spec.ts`, `tests/e2e/mobile-audit.spec.ts`; added `tests/e2e/terrace.spec.ts`.

Screenshots are generated review artifacts outside Git; original high-volume future media masters must also stay outside Git. The new responsive stock files total566,652 bytes. Their SHA-256 values are recorded in the manifest. Existing media hashes/files are unchanged.
