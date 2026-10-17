# SolarMatch Design v3: applied minimalism

v3 builds on the Design v2 that is now on `main` (commit 3571f35). It keeps the brand, tokens, type and components, and removes everything that repeats, explains too much or wraps badly. The reference is `prototype/` (open `index.html`; routes `#home`, `#estimate`, `#results`, `#installers`, `#portal`, `#enquiries`, `#enquiry-e39`, `#credits`, `#company`). Before/after screenshots are in `reference/`.

## 0. Rules for this pass

1. **The calculator is the product.** Each block either moves people toward the estimate or makes its numbers easier to trust. If it does neither, remove it.
2. **One heading, at most one sentence.** No eyebrow + slogan + paragraph stacks. Section titles say what the section is ("How it works", "Questions").
3. **Say it once per page.** Nothing appears twice on a page: not the example card, not the accepting switch, not a caveat.
4. **Symmetry.** Controls in a group share one size and edge. No row may wrap and leave an orphan (ticks, chips, buttons). If it wraps, cut items, or use a grid or a `<select>`.
5. **Phone and desktop are separate compositions.** Phone: one compact column, primary action on the first screen, secondary content collapsed. Desktop: use the width (photo bleed, two columns). Never just stretch the phone layout.
6. **Photos sit behind content and are never covered by a card.**
7. **Do not change** calculator arithmetic, questionnaire validation, consent/legal wording, storage, API contracts or tenant permissions, except where a section below says so explicitly. Legal text may be **moved** into a disclosure; never reworded or deleted.
8. All copy lives in `config/design-v2-copy.ts` (EN and TH). The new and changed keys are the `v3 copy` block near the top of `prototype/app.js` (`Object.assign(T.en, …)` / `Object.assign(T.th, …)`). Thai copy is a draft for native review.

## 1. Homepage (`components/home/home-page.tsx`, `hero-estimator.tsx`, `components/design-v2/example-result.tsx`, `app/design-v2.css`)

### 1.1 Hero: photo in the back, calculator in front
- Remove the eyebrow. On phones it wraps to two lines and slides under the sticky header.
- Remove the hero photo card and the example card inside it (the example now appears once, in 1.2).
- Structure: `section.hero3 > .hero-bg (picture) + .wrap > .hero-copy (h1, lede, billcard, trust)`. Port the `.hero3` rules from `prototype/app.css` (search `v3 · applied minimalism`).
- **Photo:** use the owner's widened photo `prototype/img/home-hero-wide.jpg` (1774×887; copy to `public/images/design-v2/`). Phone crop: `home-hero-wide-m.jpg`. Credit stays "Photo: Robert So / Pexels".
- **Desktop ≥900px (inspired by the original hero):** the photo fills the whole hero, full bleed (`object-position: right 40%`), so the house sits on the right and the water and sky on the left. A pine veil runs from the left edge, `linear-gradient(90deg, rgba(20,45,38,.8) 0%, rgba(20,45,38,.5) 34%, transparent 60%)`. H1, lede and ticks are white (tick icons lime); the calculator card on top of the photo is frosted glass so it blends in: `background:rgba(255,255,255,.68); backdrop-filter:blur(18px) saturate(1.3); border:1px solid rgba(255,255,255,.45)`, money input `rgba(255,255,255,.55)` turning solid white on focus. Hero height `min(700px, 100vh − header)`, content vertically centred.
- **Phone:** the photo is a full-bleed band at the top (`height:min(330px,40vh)`), fading to stone at the bottom. The H1 (pine) starts on the faded part. Order on phones: H1, calculator card, **then** the lede, then the ticks (the lede moves below the card; desktop keeps it above). The card stays solid white on phones. The **See my estimate** button must be visible without scrolling on a 390×844 screen.
- Lede: "Answer 10 short questions and see your home’s future with solar." / "ตอบคำถามสั้น ๆ 10 ข้อ แล้วดูอนาคตของบ้านคุณกับโซลาร์"
- Calculator card, in this order: label "Your monthly electricity bill", money input, **range slider** (500–25,000, step 100) bound to the same value both ways (typing over 25,000 pins the slider at the end), full-width **See my estimate** button. Start at ฿4,000 so the slider has a position.
- Trust line: exactly two ticks, one row on every width: "Free" and "Official MEA & PEA tariffs" (TH: "ฟรี", "อัตราค่าไฟทางการของ กฟน. และ กฟภ."). Delete `t3`.

### 1.2 Example estimate (replaces "Your estimate / Plain numbers…")
- Delete the paragraph and the four-item check list. Keep: eyebrow **"Example estimate"**, H2 **"Real numbers you can plan with."** in `--sm-green`, link **"Try it with your bill →"**.
- Order on every width: eyebrow, H2, card, then the link **below** the card.
- Desktop: the card spans the full content width, with an inner two-column grid: bill, savings line and stats on the left, chart on the right (`grid-template-columns: 1fr 1.2fr; padding: 32px`). Phone: one column.
- Card (dark): label "Monthly bill" + chip "Sathon · ฿6,000 bill"; then **before/after**: `฿6,000` struck through in coral `#FF9C87`, next to `฿4,335` in lime, **only slightly larger** (about 1.3×). Sizes: old `clamp(24px,6.2vw,30px)`, new `clamp(31px,8.2vw,40px)`; then "฿1,665 less each month"; then the three stats (system size, planning price, simple payback) without "your"; then the chart. Every figure comes from `calculateEstimate(designV2Example)` (`currentMonthlyBillThb`, `planningAfterSolarMonthlyBillThb`, `planningMonthlySavingsThb`). Screen readers get "Today" / "With solar" labels (visually hidden).

### 1.3 How it works
- Delete the eyebrow and "Three calm steps. Contact is your choice." The H2 is just **"How it works"**.
- Phone: three compact rows (number, title, one line); no white cards. Desktop: three columns. Step 3 carries the "Opening soon" chip next to its title.

### 1.4 Trust: "Careful on purpose."
- Keep the v2 structure: eyebrow **"Why trust these numbers"**, H2, one short paragraph (`trP` in v3 copy: "We count the real costs and leave out the extras. So if an installer quotes a faster payback, you’ll know exactly what to ask."), eyebrow **"Built on official sources"** with the three chips (MEA residential tariff · PEA residential tariff · Solar resource & price evidence), and "Read the full method →".
- The table has **five rows: 3 included, 2 not included**, with no signs or icons:
  - Full installation · **Included**; Maintenance and inverter replacement · **Included**; Panels ageing 0.5% a year · **Included** (labels in lime).
  - Income from selling surplus power · **Not included**; Tax deduction up to ฿200,000 · **Not included** (labels in white).
  - Remove "Future electricity price rises". Methodology keeps the tariff-escalation note. Say "Not included", never "Not counted".

### 1.5 Questions, closing, footer
- Keep the FAQ banner photo (`palms-roof.jpg`, Kindel Media credit) on both widths. Delete the eyebrow "Before you decide". The heading inside the banner is **"Commonly asked questions"**. On phones use a bottom-up gradient (`linear-gradient(0deg, rgba(20,45,38,.82), rgba(20,45,38,.1) 75%)`, min-height 200px) so the photo stays visible. Don't lazy-load it. All items start closed.
- Delete the "Compare up to 3 local installers · Opening soon" card (step 3 already says it).
- Keep the final CTA band.
- Footer (`components/site/site-footer.tsx`): brand + tagline, then **two even link groups of four** (SolarMatch: estimate, how it works, methodology, solar guide; Company: for installers, contact, privacy, terms). Show `prelaunchNotice` as one visible line. Put `legalReviewDisclosures` and the operator details in one closed `<details>` "About this service", with the wording unchanged. If legal review needs the operator line always visible, keep that one line outside the disclosure.

## 2. Estimate flow (`components/estimate/estimate-shell.tsx`, `district-combobox.tsx`, `bill-slider.tsx`)

- **Location question = two equal dropdowns.** Province `<select>` (6 launch provinces + "Another province"), then District `<select>` (all districts of that province, first option "Choose"), styled the same (`.select`, 56px). Side by side from 600px, stacked below. "Another province" swaps the district select for the existing `customLocation` text field in the same slot. Remove the province chips and the searchable combobox from this step (keep the combobox file if other code imports it).
- **Bill question:** input + slider only. Delete the five quick chips (they wrap to two rows on phones) and "Slider expands for larger bills".
- **Bill first (preferred).** The homepage already asks the bill, so make it question 1: publish questionnaire version 10 = v9 with `monthlyBillThb` moved to first (new expected order in `lib/questionnaire/validation.ts`, release record via the existing release mechanism, v9 drafts still restore). The homepage starter then lands on "Question 2 of 10" with one segment filled. People finish more often when they start with progress already made (Nunes & Drèze, 2006). *Fallback if a new version is too heavy before launch:* keep v9 order, but show the bill step pre-filled with the homepage value.
- Delete from every step: "Assessment progress stays in this browser…" and "Clear and start over". Show the privacy sentence once, on the last question only (`privacy` in v3 copy). Start over lives on the results page.
- **Desktop (≥1000px) keeps the "Your answers" panel**: question column (max 640px) on the left, a 340px panel on the right listing each answered question with a short label (Monthly bill, Location, Timeframe, Project, Home, Ownership, Daytime use, Appliances, Shade, Roof), the value and an **Edit** link. Before anything is answered it shows "Your answers will appear here as you go." Delete the "You’ll get" card. **Phones don't show the panel.**
- Option cards keep their right-hand radio/check mark. Remove the generic question-mark icons on the contact question.
- The "Test" option on the last question must stay staging-only.

## 3. Results (`components/results/results-shell.tsx`, `savings-chart.tsx`)

- **Hero:** eyebrow "Your monthly bill · {place}"; before/after (`currentMonthlyBillThb` struck through in coral, `planningAfterSolarMonthlyBillThb` in lime, about 1.3× the old bill: old `clamp(28px,7.4vw,40px)`, new `clamp(37px,9.8vw,54px)`); H1 "฿1,665 less each month" with "about 28% of today’s bill" (on phones it moves to its own line, with no leading "·"); verdict; three stats; one fine-print line. Keep the existing negative-net verdict behaviour.
- **Delete** the "Your monthly bill" bar card (`SavingsChart`). The hero now shows the same thing.
- **Delete** the "Possible extras" chips, "Incentive conditions and sources" and "Why installer quotes may differ". The **Extras** card below replaces them, and the trust ledger covers the rest.
- **New: "Extras you may qualify for"** (opt-in; the headline stays conservative):
  - *Tax deduction* switch. When on, a `<select>` "Your top income tax rate" 5–35%. Value = `min(planningInstalledCostThb, 200000) × rate`, once. Show only when `ownershipStatus` is owner. Condition line: grid-connected, installed 3 Mar 2026 – 31 Dec 2028, VAT-registered seller with e-Tax invoice. Source and cap are already in `config/solar-assumptions.ts → tax`.
  - *Sell surplus power* switch: `planningAnnualExportedKwh × 2.2` a year for `fit.termYears` (10). Disabled with "Only systems up to 5 kW qualify." when the system is larger than `fit.maxAcKw`.
  - When either is on, show three figures: tax saved (once), surplus income a year, **payback with extras**, plus "+฿X over 25 years with extras". Compute payback from `lifetimeCostSeries` with the extras subtracted (tax at year 0, surplus for years 1–10). Keep this in a small pure function in `lib/calculator/` with unit tests. Example home at 20%: ฿33,000 + ฿3,960/yr → about 6 years, ฿335,600 over 25 years.
  - Copy keys `x*` in v3 copy. Keep `includedInBaseResult:false`; nothing changes in the base result.
- "Make it more precise" becomes one closed disclosure with an "Optional" tag. It opens automatically when a refinement is set. Contents unchanged.
- Next steps: Share to LINE, Copy link, the checklist disclosure, "Compare up to 3 installers · Opening soon" on one row. Replace the long link-contents paragraph with one line, "The link holds your area, bill and answers, not your name or number.", with the full current wording in a small "What’s in the link?" disclosure.
- Order on phones: hero, chart, extras, next steps, precise, breakdown, actions. Desktop: left column chart/extras/precise; right column next steps/breakdown/actions.
- The chart's caveat note (`cNote`) moves into "Full breakdown and sources".

## 4. Content pages (`components/pages/english-pages.tsx`, `methodology-content.tsx` and the Thai routes that render the same content)

- How it works page: step 3 contains the whole service-status paragraph inline. Remove it there (it's in the footer disclosure). Keep each step to a title and one or two sentences.
- Methodology: keep every fact and source; break long paragraphs into short sections with H3s. Move the repeated service-status text to the footer disclosure only.
- Update `tests/e2e/public-preparation.spec.ts` to open the footer disclosure before asserting the legal text. Don't remove the assertions.

## 5. Installer landing (`components/installers/landing.tsx`)

- Same hero pattern as the homepage (`.hero3.inst`, `installer.jpg`): H1, one sentence, two buttons. On phones the buttons are full width and stacked.
- Delete the eyebrow and the sample-enquiry card that covers the photo.
- Facts strip under the hero: **4 equal cells** (desktop one row, phone 2×2): ฿400 per enquiry · 3 companies at most · 2 free enquiries to start · 7 days to claim wrong details. Then one line: "Draft terms. No subscription and no automatic billing."
- How it works: same compact steps as the homepage.
- Delete "Fair by design" (the facts strip says it) and the closing band that repeats the H1.
- Bug: the footer is rendered as `wrap footer`, so the dark box is narrower than the page on desktop. Render `<footer className="footer"><div className="wrap">…`.

## 6. Installer portal (`portal.tsx`, `workspace.tsx`, `enquiry-detail.tsx`, `credits.tsx`, `company.tsx`, `app/installers-v2.css`)

- **Header:** switch label "Accepting enquiries" (not "Accepting preference"); the status line under the company name says "Accepting enquiries" / "Paused". If the platform is paused (`availability.platformPaused`), show "Paused by SolarMatch" in that status line. Don't add an explanation paragraph.
- **Company page:** delete the second "Accepting enquiries preference" card (the header switch is the one place). Service areas = the 6 province buttons in an even grid (2 columns on phones, 3 on desktop) with "2 / 6"; drop the subtitle. Per day: title + stepper only. LINE alerts: title, one line, Connect. Delete "Shared residential enquiries · Up to 3 companies per request" under the form.
- **Remove everywhere:** the page footer "SolarMatch provides a preliminary assessment… All times are Bangkok time" (keep it once on the terms view), the sidebar line "Your next connection starts here.", "Opening or calling does not record a successful contact.", and "{n} results · Oldest first" (it also says "1 results").
- **Today:** keep Call next, Also waiting (name in bold, then "area · bill · waiting" on one small line), one list with Credits and "{n} enquiries need an update".
- **Enquiry detail:**
  - Contact: full-width **Call** button; below it, LINE and Copy number share one row equally. On desktop all three sit on one row.
  - Household: **4 highlighted facts** (bill, air-conditioners, ownership, timeframe); the rest in a closed "More about the home" disclosure. Show money as `฿7,200`, not "7,200 THB/month" (format in `lib/installer/assessment-display.ts` with the portal money formatter).
  - Progress: replace the seven stacked rows with a 5-segment bar (open → contacted → site visit → quoted → won), the current status chip, one primary button for the next stage ("Mark as contacted", "Site visit booked", "Quote sent", "Mark as won") and a secondary **Close** menu with Lost / Not suitable (the prototype shortens this to “Mark as lost”). Same API (`report-outcome`). Team notes save automatically on blur (keep revision checks); replace the Save button with "Saved automatically."
- **Credits:** each statement row shows title, date and one signed amount. Delete the "Available −2 · Reserved 0 · Trial 0 · Debt 0" breakdown (put it in a row disclosure only if support needs it). Under the balance, show reserved/debt only when non-zero. Package card: price, PromptPay button, one note. Delete "Tax and invoice policy pending" from the UI.

## 7. Phone vs desktop: niche issues fixed in v3

| Where | Problem on main | v3 |
|---|---|---|
| Home hero, phone | Eyebrow wraps and slides under the sticky header | Eyebrow removed |
| Home hero, both | Three ticks wrap to two rows | Two ticks, `nowrap` |
| Home, both | Example card shown twice; hero photo hidden behind it | Example once; full-bleed photo behind the calculator |
| Location step, desktop | Province chips stack unevenly, one per line | Two equal dropdowns |
| Bill step, phone | Five quick chips wrap, leaving one alone | Chips removed; slider + input |
| Estimate, desktop | Empty "Your answers" card on step 1, plus a "You’ll get" card | Panel kept (desktop only) with an empty-state line; "You’ll get" removed |
| Results, phone | Bill bars repeat the hero; long link-privacy paragraph | Removed; one line + disclosure |
| FAQ, phone | Banner photo is mostly a flat gradient | Gradient runs from the bottom so the photo shows |
| Footer, phone | Three link lists stacked, four legal paragraphs | Two even groups, one line + disclosure |
| Installer landing, desktop | Footer box narrower than the page | Full-width footer |
| Portal, both | Accepting switch on two screens; internal accounting per statement row; "1 results" | One switch; one amount per row; count removed |
| Enquiry, phone | Seven progress rows, ten equal facts | 5-segment bar + one action; 4 facts + disclosure |

## 8. Acceptance checks (every prompt)

- 360, 390, 768, 1440 px; EN and TH; no horizontal scroll; no row that wraps leaving one item alone.
- Home on 390×844: H1, bill input, slider and **See my estimate** visible without scrolling.
- Every figure comes from `calculateEstimate` (example card, results hero, extras); unit tests for the extras maths.
- axe (wcag2a/aa, 21aa, 22aa) clean; focus visible; reduced motion respected; the slider has an accessible name and keyboard steps.
- Existing Playwright suites pass. Update selectors, never weaken assertions about legal text, consent or calculations.
