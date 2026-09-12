# Terrace cinematic redesign — review branch

## Boundary and recovery

Branch: `redesign/terrace-cinematic-v1`. Baseline: `88c41b024f36e205ccfccb72ef7e68b7ef8adff2` on `main`.
This is a local review build, not a production deployment. No merge to main, production migration, Access change, secret operation, or Milly’s operation is part of this work.

The public design lives in `app/terrace.css`, scoped beneath `PublicDesignShell`. Admin receives no Terrace class. Existing base CSS remains available for admin and preserved implementation details. To abandon this design, return to main after saving any new work; never reset user files. No data rollback is needed.

## Identity and style tile

- Pine `#142D26`: primary text, CTAs, hero/result surfaces.
- Warm Stone `#F4F3ED`: page surface and negative space.
- Lime `#D6EF91`: sparing hero/result emphasis; dark Pine text required on Lime.
- Garden `#68816B`: secondary chart line, visual accents; not small body text on Stone.
- Muted ink `#536259`: accessible secondary text on Stone.
- Rule `#CBD0C4`: thin editorial dividers.
- Manrope for English, Anuphan for Thai, including weight 400. Thai headings and eyebrows have zero tracking, with a 1.4 heading line height; body 1.75.
- Official existing sun/roof SVG geometry and original logo gold/green preserved. No AI replacement logo.
- Maximum content width 1320px, 40px desktop gutters, 18px mobile gutters; offset two-column editorial sections, three numbered steps.
- Controls have 2px corners, visible labels, minimum 44px interaction target (normally 50px CTAs), no decorative shadows.
- Existing short opacity/12px step transitions and reduced-motion behavior retained. No new scrolling animation.

Visual tile: `docs/terrace/style-tile.html` (standalone reference, no app route).

## Public surfaces

Homepage: static architectural hero → three practical assurances → introduction → three numbered steps → residential roof photo and estimate contents → real bill estimator → methodology/source links → existing FAQs → final CTA.

The stock home is illustrative architecture, not a SolarMatch customer, Bangkok installation, partner project, or final generated frame. Credit is shown. It temporarily establishes the architectural composition while the commissioned media is blocked. The residential solar photo remains licensed Kindel Media imagery.

Calculator: existing eleven questions and same one-at-a-time state machine. Desktop photographic sidebar plus wide Stone form; at 900px and below the sidebar becomes a 128–145px image masthead. Back/Next remains normal document flow. District search/eight-option viewport, bill slider, permissions, AC inputs, consent and API behavior are unchanged.

Contact: existing single form, unticked confirmations and exact legal text. No new fields or submission endpoints.

Results: Pine hero, Lime savings figure, rule-separated primary metrics, three-column desktop supporting metrics/one-column mobile, flatter refinement/chart/table surfaces. Chart palette changed only; dashed comparison line also distinguishes curves without relying solely on color. Calculation values and disclaimers unchanged.

Supporting pages use the same typography, surface, rules and spacing; their legal/educational text and dynamic publication behavior are preserved.

## Media status — blocked, not generated

The Terrace reference at `https://solarmatch-design-study.deluxejahseh.chatgpt.site/terrace?lang=en` required ChatGPT sign-in and could not be visually inspected. The supplied detailed brief is the visual specification.

Installed Higgsfield connection was inspected. Balance was 10 credits on a free plan. A `gpt_image_2` 2K/high/16:9 still request was rejected with `Requires basic plan or higher.` No job ID or image was returned. No plan upgrade or credit purchase was made. No video generation was attempted. Estimated 12s/1080p `seedance_2_5` cost was 108 credits per clip at inspection (not a price guarantee).

The owner must enable a suitable Higgsfield plan and sufficient credits before media generation can continue. No other generator was substituted. Static redesign can be reviewed independently.

Prepared artifacts:

- `docs/terrace/cinematic-storyboard.md`: timing, continuity, desktop/mobile prompts, acceptance checks.
- `docs/terrace/asset-manifest.json`: actual stock assets and blocked generated outputs; no invented job IDs/paths.
- `docs/terrace/style-tile.html`: static palette/type/control study.

No video, canvas, frame import, media preload, wheel listener, scroll pinning, or frame scrub is installed. A future approved implementation must not download both desktop and mobile animations.

## Preview and verification

Use the existing production build and local Wrangler runtime (`pnpm build`, then `pnpm exec wrangler dev --ip 127.0.0.1 --port 3000`). This uses local D1/R2, never remote data. Required runtime is Node >=22.13; use the bundled Node when the shell resolves an older version.

- English home: `http://127.0.0.1:3000/en`
- Thai home: `http://127.0.0.1:3000/`
- Calculator: `http://127.0.0.1:3000/en/estimate`
- Results: complete the calculator and choose No; this exercises the real calculator and loading state.

The local preview is not a public deployment. Local contact collection may be disabled when no operational local configuration exists; tests exercise the real frontend with explicit mocked public configuration and submission responses. No real lead is sent during tests.

Verification commands: lint, typecheck, unit tests, production build, full Playwright suite. New `terrace.spec.ts` checks static-only assets, Thai/English axe accessibility, screenshot evidence, menu focus, and exclusion of admin. Existing journey and mobile suites still cover all real questionnaire/contact interactions, disclosure versions, slider geometry, searchable districts, and results.

See `docs/terrace/verification.md` for final outcomes and limitations.

For repeatable visual captures, run `node scripts/capture-terrace-review.mjs`. Output defaults to the sibling `outputs/solarmatch-terrace-review` folder, outside Git. The script refuses remote hosts, blocks `/api/leads`, and uses a local visual fixture for the contact form. It captures desktop1440 and mobile390 screenshots of Thai/English home, bill, results and privacy, plus English consent/contact. These are review artifacts, not submitted customer data.
