# Prompts for Claude Sonnet (Claude Code)

**Before you start:** copy this folder into the repo as `docs/design-installer-landing/`, commit it on a new branch, then open Claude Code in the repo with Sonnet selected.

Run **Prompt 1**. Check the result in a browser at your phone and iPad widths, then run **Prompt 2**. If something looks off, describe it in plain words and point to the matching screenshot in `docs/design-installer-landing/reference/`.

---

## Prompt 1: build the new landing page

```
Redesign the signed-out installer landing page (/installers) to match docs/design-installer-landing/.

Read these first, in order:
1. docs/design-installer-landing/LANDING_SPEC.md (the full spec; §0 rules apply to everything)
2. docs/design-installer-landing/prototype/index.html, landing.css and landing.js (the visual and behavioural reference; open index.html in a browser if you can)
3. The screenshots in docs/design-installer-landing/reference/
4. The current code: components/installers/landing.tsx, components/installers/signal-landing-copy.ts, components/installers/portal.tsx (only how it renders InstallerLanding and the auth panel), app/installers-signal.css, tests/unit/signal-landing.test.ts

Then implement:
- Rewrite InstallerLanding in landing.tsx to the new structure (header, glow hero, examples feed, How it works sun path, full-bleed questions, footer).
  Keep its props, SignalBrand/SignalLogo, the availability logic (available / canApply), the skip link, the single <main id="installer-landing-main" tabIndex={-1}>, and the auth panel replacing the right-hand column.
- Create components/installers/landing-examples.tsx and components/installers/landing-sun-path.tsx as 'use client' components.
  Port initFeed() and initPath() from the prototype with useEffect/useRef/requestAnimationFrame, clean up on unmount and respect prefers-reduced-motion.
  Put the pure arithmetic (feed loop wrap, sun progress and lit thresholds) in small exported helpers so it can be unit-tested.
- Replace the landing strings in signal-landing-copy.ts with the EN/TH copy from the spec.
  signalLandingFaq returns four [question, answer] pairs built from config.commercial. Mark new Thai as needing native review.
- In app/installers-signal.css, replace the old landing rules with the prototype's landing.css, scoped under .signal.landing and using --sm-* tokens.
  Keep .auth and every portal rule; grep before deleting any shared class.
- Use /images/design-v2/roof-tile.jpg for the questions banner (credit "Photo: Kindel Media / Pexels").

Do not change portal behaviour, auth endpoints, payment, claims, or the docs/design-signal folder.
The owner has decided to drop the old landing-only FAQ sentences listed in LANDING_SPEC §0; do not re-add them.
When you're done, tell me which files changed and anything you couldn't match.
```

---

## Prompt 2: tests and checks

```
Finish the installer landing redesign against docs/design-installer-landing/LANDING_SPEC.md §8 and §9.

1. Update tests/unit/signal-landing.test.ts for the new page, keeping every availability, money and privacy assertion's intent, and add unit tests for the feed-loop and sun-path helpers.
   Fix any e2e selectors that pointed at .a-hero, .stack or #price.
2. Run pnpm lint, pnpm typecheck, pnpm test and the installer Playwright suites; fix failures without weakening assertions.
3. With Playwright, open /installers (signed out) at 360, 390, 768, 1180x820 and 1440 px in English (?lang=en) and Thai:
   - assert no horizontal scroll;
   - at 860 px and wider, scroll How it works into view and assert each step circle's centre is within 1 px of its arc point (12%/218px, 50%/96px, 88%/218px of the .path box);
   - with reduced motion emulated, assert the feed's pause button shows Play and all three steps have class "lit";
   - run axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice) closed and with a question open, and fix every violation.
4. Save screenshots of each width/language next to the reference ones and compare. Fix visible differences (spacing, sizes, colours, the hero filling the iPad screen, the seamless fade into How it works, the slimmer phone feed).
5. Report what passed, what you fixed, and anything that still differs from the reference.
```
