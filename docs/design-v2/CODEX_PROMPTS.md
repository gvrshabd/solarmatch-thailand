# Prompts for ChatGPT / Codex

Run these in order, one per session or branch. Each assumes the `design-v2/` folder (this handoff) has been copied into the repository at `docs/design-v2/`. After each prompt, review the result in the browser at 390 px and 1440 px in English and Thai before moving on.

---

## Prompt 1: tokens, type and shared fixes

> Read `docs/design-v2/DESIGN_SPEC.md` sections 0–6 and `docs/design-v2/tokens.css`. Add the tokens to the app, imported once globally, and replace hard-coded colours in `app/terrace.css` and `app/installers.css` with the `--sm-*` variables where they correspond. Remove the Georgia heading override in `app/installers.css` (line 25). Add the programmatic-focus rule `[tabindex="-1"]:focus{outline:none}`. Change all buttons to the pill shape and the button rule in §2 (pine primary on light, lime only on dark). Do not change any copy, legal text, or calculator code. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the Playwright suites; update selectors only where styling changes broke them.

## Prompt 2: homepage

> Implement §7.1 and §7.2 of `docs/design-v2/DESIGN_SPEC.md` in `components/home/home-page.tsx`, `components/home/hero-estimator.tsx`, `components/site/site-header.tsx` and `components/site/site-footer.tsx`. Use `docs/design-v2/prototype/` (route `#home`) as the visual reference and `prototype/app.js` object `T` for EN/TH copy. Compute the example card with `calculateEstimate()` using the answers listed in the spec; never hard-code the figures. Use the new hero photos in `docs/design-v2/prototype/img/` (copy to `public/images/`, keep photographer credits). Remove the duplicate CTA, the notice box under the hero, and the repeated sentences listed in the spec. Add a Playwright check that no page renders `[A-Z_]` bracket placeholders. Keep axe clean.

## Prompt 3: estimate flow

> Implement §7.3 and §7.5 of the spec in `components/estimate/estimate-shell.tsx` and `components/results/calculation-loading.tsx`. Keep the questionnaire config, validation, storage and API behaviour unchanged. Add "Question n of 10", province chips for `initialLaunchProvinces` with an "Another province…" fallback, the bill quick chips, the AC stepper, auto-advance for single-choice questions (260 ms, not when a follow-up field appears), the desktop "Your answers" / "You'll get" column, hidden Back on step 1, a fixed bottom action bar on mobile, and the three-step loading screen (max 2.5 s, reduced-motion aware). Match prototype route `#estimate`. Update the e2e helpers in `tests/e2e/site.spec.ts` for any renamed buttons.

## Prompt 4: results

> Implement §7.6 in `components/results/results-shell.tsx`, `lifetime-cost-chart.tsx` and `savings-chart.tsx`: dark hero led by monthly saving, three stats, one fine-print line, the 25-year chart with the crossing marker and the year-25 gap label using `planningTwentyFiveYearNetBenefitThb` (narrower viewBox under 640 px), bill bars, extras chips, the "Make it more precise" refinements (existing optional fields) with a toast, a Next steps card (LINE share with a URL that reopens the same estimate from encoded answers, copy link, installer checklist, matching "opening soon"), "Why installer quotes may differ", and a collapsed full breakdown. Remove the long legal paragraph from between metrics and charts but keep the legal text in the disclosure and footer. Do NOT change the recommendation logic; flag the low-bill case for the owner.

## Prompt 5: portal shell and Today

> Implement §8.2 and §8.3 in `components/installers/portal.tsx`, `workspace.tsx` and `app/installers.css`. Rename Overview to Today. Add the header accepting switch (maps to `company.paused`, saves immediately, toasts), move Sign out to an avatar menu, remove the "Installer portal" eyebrow, build the Call next card with waiting time from `deliveredAt`, the also-waiting list, the needs-outcome row, the credits row. Hide the 30-day stats card until real data exists. Add the pending-approval onboarding checklist and status-correct empty states. Match prototype routes `#portal` (toggle the demo view to Pending review to see that state).

## Prompt 6: enquiries and detail (with data fixes)

> Implement §8.4 and §8.5. In `lib/installer/portal-data.ts` stop joining raw slugs into `location`: return province and district ids and render localised labels using `config/provinces.ts` and `config/districts.ts`. Stop rendering the fixed `qualification` string. Format phone numbers for Thai display. Add `preferredContactMethod` and `lineId` to the delivery projection when those fields were disclosed (respect `fields_disclosed_json` and withdrawal rules exactly like the other fields). Add outcome stages `contacted`, `site_visit`, `quoted` alongside `open`, `won`, `lost` (migration + API validation + tests). Build the two-column detail layout with Call / LINE / Copy, the highlighted household facts, the progress tracker, notes, and the closed disclosures for staff links and claims. Remove internal labels like "Notification status".

## Prompt 7: credits and company

> Implement §8.6 and §8.7: balance card with "enough for n shared enquiries", package card with "Pay with PromptPay" and the not-charged note, a single statement list, one money formatter (`Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0})`) used everywhere in the portal, and the company page with province chips (replacing the comma-separated text field; the stored model stays `service_provinces_json`), the per-day stepper, the LINE alerts card and the details form. Restyle claims, terms and payment status (§8.8).

## Prompt 8: content pages, SEO and final QA

> Apply the v2 type and tokens to how-it-works, methodology, resources, solar-guide and contact; shorten headings as in §7.7 without changing legal or source text. Give each page its own meta description in EN and TH and add Organization and WebSite JSON-LD (plus FAQPage where there's an FAQ). Then run the full QA checklist in §10 at 360/390/768/1440 px in EN and TH and fix anything that fails. Report what you changed and any test you had to update.
