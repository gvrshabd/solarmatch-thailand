# SolarMatch Design v2: build specification

Version 1 · 15 October 2026 · Owner: Shabd · Design: Claude · Implementation: ChatGPT / Codex

This document tells an implementer exactly how to bring the SolarMatch homeowner site and installer portal up to the v2 design. The clickable prototype in `prototype/` is the visual source of truth. Port its values and behaviour into the existing Next.js app; do not copy its vanilla JavaScript.

Open `prototype/index.html` in a browser (serve the folder over HTTP, e.g. `npx serve prototype`). Routes are hash-based: `#home`, `#estimate`, `#results`, `#installers`, `#portal`, `#enquiries`, `#enquiry-e39`, `#credits`, `#company`. The EN/TH switch is in every header.

---

## 0. Ground rules

1. **Do not change legal text, consent text, consent versions, or the fail-closed contact modes.** Layout around them may change; the words and checkbox semantics may not.
2. **Do not change calculator maths** in `lib/calculator/*` or `config/solar-assumptions.ts`. One recommendation-logic change is proposed in §7.6 and needs the owner's decision first.
3. **No fabricated data.** No fake reviews, counts, competitor meters or invented statistics. Any example figure must be computed by the real calculator, or clearly labelled "Example".
4. **Thai is first-class.** Every new string ships in Thai and English. Thai copy in this spec and the prototype is a draft for native review.
5. **Mobile first.** 78% of Thai web traffic is mobile (StatCounter, Sep 2026). Design and test at 360–430 px before desktop.
6. Keep all existing accessibility behaviour: focus management, reduced motion, 44 px targets, axe-clean pages.

---

## 1. Design principles

| Principle | What it means in practice |
|---|---|
| Show the payoff early | A real number appears on the first screen of the homepage. |
| Calm, not salesy | One primary action per screen. No timers, no pressure copy. |
| Say each caveat once | One plain line beside a number; full text in one disclosure. |
| Quietly premium | Warm stone canvas, white cards, one soft shadow level, big tabular numerals, capsule buttons. |
| Thai-first rhythm | Anuphan for Thai, zero letter-spacing, taller line height; numbers always in Manrope. |
| Speed for installers | The next call, how long the homeowner has waited, and one-tap actions come first. |

---

## 2. Tokens

Drop `tokens.css` into the app and replace hard-coded colours in `app/terrace.css` and `app/installers.css` with these variables. Both products use the same tokens.

| Token | Value | Use |
|---|---|---|
| `--stone` | `#F5F4EF` | Page canvas |
| `--stone-2` | `#EEEDE6` | Chart tracks, subtle fills |
| `--white` | `#FFFFFF` | Cards |
| `--pine` | `#142D26` | Text, primary buttons on light, dark surfaces |
| `--pine-2` | `#1E3A30` | Hover, gradients |
| `--lime` | `#D6EF91` | Primary action **on dark surfaces only**; hero figures on dark |
| `--lime-2` | `#C9E57A` | Lime hover |
| `--gold` | `#E2A62B` | Brand sun (logo), small warm accents, "opening soon" |
| `--gold-soft` | `#F7EBD0` | Example tags, pending states |
| `--green` | `#137A50` | Brand roof (logo), success ticks, focus ring |
| `--sage` | `#E7ECE1` | Secondary buttons, chips, soft bands |
| `--line` | `#E1E4DB` | Hairlines, input borders |
| `--line-2` | `#CDD3C6` | Hover borders |
| `--muted` | `#5B6A61` | Secondary text (5.4:1 on stone) |
| `--ondark` | `#B8C7BE` | Secondary text on pine only (fails contrast on white) |
| `--ok` | `#2F8A57` | Accepting / success dots and icons. For small success **text** on white use `--green` |
| `--danger` | `#A4402A` | Errors, negative values |

Radii: `--r-xl 32px` (hero cards, photos), `--r-lg 24px` (cards), `--r-md 18px` (inputs, options), `--r-sm 12px`, `--pill 999px` (all buttons, chips, toggles).

Shadow (one level only): `0 1px 2px rgba(20,45,38,.04), 0 12px 32px -12px rgba(20,45,38,.14)`. A stronger "lift" shadow is used only for photos and the dark hero cards.

**Button rule:** on light surfaces the primary button is pine with white text; on dark surfaces it is lime with pine text. Secondary is sage. Never put two primary buttons side by side.

---

## 3. Typography

- English: **Manrope** 400–800. Thai: **Anuphan** 400–700. Numbers and currency always Manrope with `font-variant-numeric: tabular-nums`.
- **Remove the Georgia override** in `app/installers.css` (line 25: `.installer-shell[lang=en] h1{font-family:Georgia,serif;font-weight:400}`).
- Headings: weight 700, letter-spacing `-0.035em`, line-height 1.06, `text-wrap: balance`.
- Thai headings: weight 600, letter-spacing 0, line-height 1.35. Thai body line-height 1.7.
- Eyebrows: 12.5 px, 700, uppercase, 0.12em tracking (EN); 13.5 px, no uppercase, no tracking (TH). Use at most two per page.

| Role | Size (clamp) |
|---|---|
| Home hero H1 | `clamp(40px, 5.6vw, 66px)` (TH `clamp(36px, 5.4vw, 62px)`) |
| Section H2 | `clamp(32px, 4.4vw, 54px)` |
| Question H1 (estimate) | `clamp(30px, 4vw, 46px)` |
| Result headline figure | `clamp(64px, 11vw, 120px)` |
| Portal page title | `clamp(32px, 4vw, 46px)` |
| Body | 16 px; lede 17–20 px |

---

## 4. Components

All measurements are in `prototype/app.css`; class names below refer to it.

- **Buttons** (`.btn`): min-height 52 px (40 px for `.btn-sm`), pill radius, 700 weight, icon 18 px trailing arrow for forward actions. Variants: primary (pine), lime (dark surfaces), soft (sage), ghost (1.5 px inset border).
- **Money input** (`.money-input`): 60–72 px tall, ฿ prefix, unit suffix "per month", live thousands separators, numeric keyboard (`inputmode="numeric"`).
- **Choice options** (`.opt`): full-width cards, 64 px min height, label + optional description, circular mark on the right (rounded square for multi-select). Selected: pale lime-green fill `#F3F8EA` with 2 px pine inset border. **Remove the repeated generic icons** on options; they don't differentiate answers.
- **Chips for single choice** (`.pchip`): 48 px pill buttons for short option sets (provinces).
- **Stepper** (`.stepper`): − / value / + for counts (air-conditioners, enquiries per day).
- **Switch** (`.switch`): 52×32, green on, grey off, `role="switch"` with `aria-checked`.
- **Disclosure** (`.disc`, `.faq`): summary row with chevron; used for caveats, staff links, claims, breakdowns.
- **Toast** (`.toast`): bottom-centre pill, `role="status"`, 2.6 s.
- **Header** (`.hdr`): sticky, translucent stone with blur, hairline appears after scroll. Mobile under 460 px hides the header CTA (the hero has one).
- **Portal navigation**: desktop sidebar 248 px on `#ECEEE6`; active item filled pine. Mobile: translucent bottom tab bar with badge.

## 5. Motion

- 180–320 ms, ease `cubic-bezier(.2,.7,.2,1)`. Question pages fade-and-rise 10 px on enter.
- Single-choice questions **auto-advance 260 ms after selection** unless the option reveals a follow-up field. Back always works.
- Results loading uses visible steps (see §7.5). Respect `prefers-reduced-motion`: transitions become instant, loading steps shorten to 250 ms each.

## 6. Imagery

Five licensed Pexels photos (free for commercial use, credit optional; we keep a small credit chip):

| File | Photographer | Use |
|---|---|---|
| `home-hero.jpg` / `home-hero-m.jpg` | Robert So | Homepage hero (house, palms, panels) |
| `palms-roof.jpg` | Kindel Media | Homepage FAQ band |
| `roof-tile.jpg` | Kindel Media | Calculator masthead on desktop (optional) |
| `installer-tall.jpg` / `installer.jpg` | Los Muertos Crew | Installer landing |
| `modern-roof.jpg` | Budget Bizar | Spare: methodology or guide pages |

Serve 1800 px desktop / 900 px mobile JPEGs (or AVIF/WebP via the existing pipeline). Overlay a pine gradient only where text sits on a photo. Replace the current homepage hero (a house with a car and no panels).

---

## 7. Homeowner site

### 7.1 Header and footer — `components/site/site-header.tsx`, `site-footer.tsx`
- Nav: How it works · Why trust us · For installers. Language switch as a two-segment pill (ไทย | EN). CTA "Free estimate".
- Footer: three link columns plus one fine-print line: "Pre-launch preview. All figures are planning estimates, not quotations." **Remove the bracketed operator placeholders before launch** (fill real values; add a test that fails on `\[[A-Z_]{4,}\]` in rendered pages).
- Contact page: add a LINE Official Account row once you have one. LINE reports 56 million users in Thailand.

### 7.2 Home — `components/home/home-page.tsx`, `hero-estimator.tsx`
Section order (see prototype `#home`):
1. **Hero.** Eyebrow "Free home solar estimate · Bangkok & nearby". H1 "How much could solar save your home?" / "โซลาร์ช่วยบ้านคุณประหยัดได้เท่าไร?". Lede. **Bill input card with the primary button** (reuse `HeroEstimator`). Three ticks: No phone number needed · Free, no obligation · Official MEA & PEA tariffs. Right: photo with an overlaid **Example** card computed by the calculator (Sathon, ฿6,000, detached house, high daytime use, AC×5, pump, home office, concrete tiles, almost no shade → ฿1,665/month, 4.5 kWp, ฿165k, 9 yrs). Compute it at build/render time with `calculateEstimate()`; never hard-code numbers.
2. **"Plain numbers you can plan with."** Four ticks + the same example as a mini results card with the 25-year chart.
3. **How it works.** Three numbered cards; the third ("Compare up to 3 installers") has a dashed border and an "Opening soon" chip while contact is disabled.
4. **"Careful on purpose."** (dark band) Explains why our payback is longer than sales quotes, with a five-row table: maintenance & inverter replacement (Included), panel ageing (Included), surplus income (Not counted), tax deduction (Not counted), future price rises (Not counted). Source chips: MEA tariff Sep 2026, PEA tariff, ERC 2026 programme, Revenue Department Royal Decree 805. Thai solar marketing often quotes 3–6-year paybacks (for example a 2026 sponsored article in Naewna); this section turns our more conservative number into a trust signal.
5. **FAQ band** with photo, then five questions: roof leaks, rainy season, panel/inverter life, MEA/PEA approval, "Is SolarMatch an installer?". Answers are in the prototype copy (`faq`).
6. **Opening-soon card** for installer matching.
7. **Final CTA** "See what your roof could do."

Delete: the grey "SolarMatch is preparing its installer referral service…" notice under the hero (keep it in the footer fine print and Terms), the duplicate "Start with your electricity bill" link, and the repeated sentences "This tool organizes initial information…" and "Receive the full result free of charge without providing contact details" (say each once).

### 7.3 Estimate flow — `components/estimate/estimate-shell.tsx`
- Header: logo, "Question n of 10" (TH "ข้อ n จาก 10"), close button. The 11th screen (contact choice) reads "Last question".
- Remove the photo masthead on mobile (it repeats on every step and pushes answers down). On desktop, replace it with a sticky right column: **Your answers** (each with Edit) and **You'll get** (three ticks).
- Step 1: **province chips** for the six launch provinces (`initialLaunchProvinces`) plus "Another province…" which opens the existing searchable list; district as a select or the existing combobox. Drop the optional postcode from this step.
- Bill: big money input + slider (฿500–฿25,000) + quick chips ฿2,000 / 4,000 / 6,000 / 10,000 / 15,000. Helper: "Use a recent MEA or PEA bill. A rough figure is fine."
- Appliances: multi-select options; the AC count becomes a **stepper** that appears when "Air conditioning" is selected.
- Hide Back on the first question (don't just disable it).
- Mobile: the Back (icon only) / Next bar is fixed at the bottom with safe-area padding.
- **Focus outline fix:** headings receive programmatic focus on step change; suppress the visible outline for that case only:
  ```css
  [tabindex="-1"]:focus { outline: none; }
  ```
- Contact question (pre-launch): if "Yes" is chosen while contact is disabled, show the note "Thanks. When matching opens, we'll offer it on your results page. We won't ask for your details today." and continue to results.

### 7.4 Contact form (when legally enabled) — `estimate-shell.tsx`, `config/contact-content.ts`
Keep the exact consent text and checkbox. Improve presentation only:
- Above the checkbox, a three-line plain summary (who sees what, that installers pay us, that you can withdraw), then "Read the full consent" disclosure containing the exact legal text. **Legal must approve the summary wording before it ships.**
- Make "Continue to my estimate without submitting" a visible secondary button, not plain text.
- Add the preferred contact method (Phone / LINE) as large options; show the LINE ID field only when LINE is chosen.

### 7.5 Loading — `components/results/calculation-loading.tsx`
Replace the single spinner with three visible steps that tick off ("Reading the MEA residential tariff" → "Sizing a system for your bill and roof" → "Working out savings and payback"), about 0.75 s each, max 2.5 s. Showing the work being done raised perceived value about 8% in Buell & Norton's study. Keep the published loading fact underneath the steps if you want it, but prefer a Thailand-relevant fact over the US EPA tree equivalence.

### 7.6 Results — `components/results/results-shell.tsx`, `lifetime-cost-chart.tsx`, `savings-chart.tsx`
Order (prototype `#results`):
1. **Dark hero.** Eyebrow "Your estimate · Sathon, Bangkok". Headline figure = **monthly saving** (`planningMonthlySavingsThb`). Line: "less on your electricity bill each month" + "About 28% of what you pay today". Verdict chip from the existing copy. Right side: three stats (system size, planning price, simple payback). One fine-print line: "Planning estimate, not a quotation. How we calculate".
2. **25-year chart card.** Draw from `lifetimeCostSeries`. Mark the crossing point ("Costs cross ≈ year 9"), label the year-25 gap with `planningTwentyFiveYearNetBenefitThb` ("฿263k saved"; red "Costs ฿9k more" when negative). On phones render a narrower viewBox (360 wide) so labels stay 11 px.
3. **Monthly bill bars** (today vs with solar) and **extras chips**: "Tax deduction up to ฿200,000", "Sell surplus at ฿2.20/kWh" + "Both depend on eligibility and approval."
4. **Make it more precise** (roof direction, slope, usable area, electricity phase). Recalculate on change and toast "Estimate updated".
5. Right column: **Next steps** (Share to LINE, Copy link, "Questions to ask any installer" checklist, "Compare up to 3 installers — Opening soon"), **Why installer quotes may differ**, **Full breakdown and sources** (collapsed).
6. Share links must reopen the same estimate: encode the answers (not personal data) in the URL or a short server-side ID. The LINE share URL is `https://social-plugins.line.me/lineit/share?url=<encoded>`.

Remove the long legal paragraph between metrics and charts; one fine-print line plus the disclosure is enough.

**Decision needed (owner):** at a ฿2,000 bill the calculator returns "Solar may suit your home" while payback is 24.8 years and the 25-year net is −฿9,000. Recommended: when `planningTwentyFiveYearNetBenefitThb < 0`, show a third verdict ("Solar is unlikely to pay off at this bill yet") or at least the note the prototype shows. This is a copy/logic decision in `lib/calculator/residential-estimator.ts`; do not change it without approval.

### 7.7 Content pages — how-it-works, methodology, resources, solar-guide, contact
Apply the new tokens and type. Shorten headings to what the page gives ("How we calculate your estimate", not "A useful ballpark without pretending it is a quote"). Keep all legal and source text. Fix the contact page heading wrap and placeholders. Give each page its own meta description (all English pages currently share one) and add Organization + WebSite JSON-LD, plus FAQPage on the FAQ.

---

## 8. Installer portal — `components/installers/portal.tsx`, `workspace.tsx`, `app/installers.css`

### 8.1 Signed-out landing and join
Prototype `#installers`. Hero "Homeowners who already know their numbers." with Apply / Explore the demo portal, a four-cell terms grid (฿400 · 2 credits; at most 3 companies; 2 free enquiries; claim within 7 days, marked "Draft terms"), a sample enquiry card over the photo, three steps (Apply → Connect LINE → Call fast), the "Fair by design" comparison table and an installer FAQ. **Read all figures from `data.commercial`** (credit value, shared credits, claim days, trial deliveries, recipient limit) so the page never contradicts the terms. Keep the sign-in and registration forms as they are, but put them on the right of this page on desktop and below the hero on mobile.

### 8.2 Shell
- Remove the "Installer portal" eyebrow and the per-page "Sign out" button; put Sign out in an account menu on the company avatar.
- Header right: **Accepting enquiries switch** (maps to `company.paused`), language switch. On phones show the switch without its label; the status line under the company name says "Accepting enquiries" / "Paused" / "Pending review".
- Hide navigation badges while the company is pending approval.

### 8.3 Today (rename "Overview")
- **Call next** dark card: the oldest unstarted enquiry, a "Waiting 12 min" chip computed from `deliveredAt`, chips for bill / AC count / timeframe, buttons Call (tel:) and Open enquiry, and the true sentence "Up to 2 other companies may also contact this homeowner." Do not mark as contacted when Call is tapped.
- **Also waiting** list, then "**n enquiries need an outcome**" (enquiries in progress).
- Right column: credits row ("18 credits · enough for 9 enquiries" + "Top up"), **Last 30 days** stats (median first call, contacted, quotes sent, won). Hide this card until real outcome data exists; never show example numbers in production.
- **Pending approval state** (currently shows "You're all caught up", which is wrong): show an onboarding checklist. Application submitted ✓ · Company review (we email you) · Choose service areas · Connect LINE alerts · 2 free enquiries unlock on approval.
- **Empty states must match status.** An approved company with no enquiries sees "You're all caught up. New enquiries appear here and in LINE.", not "needs approval".

### 8.4 Enquiries
Segmented control New / In progress / Closed with counts, a search field, and cards showing name, area, cost chip (Free trial / 2 credits), bill, AC count, status dot and "received 12 min ago".

### 8.5 Enquiry detail
Two columns on desktop.
- **Left:** name, area, time waiting; contact bar with Call (formatted number, e.g. 081 234 5678), LINE (when the homeowner chose LINE) and Copy number; a "Prefers LINE" chip. Then the **Household** facts grid with ownership and timeframe highlighted first.
- **Right:** a **Progress** tracker (New → Contacted → Site visit → Quote sent → Won / Lost), notes for the team, closed disclosures "Share with a team member" and "Problem with this enquiry?" (claim deadline in the text), and fine print "Paid · 2 credits · delivered 14 Oct, 10:00".

Data fixes needed:
- `deliveryProjection` (lib/installer/portal-data.ts) joins raw slugs into `location` ("bangkok / sathon"). Return province and district ids and render localised labels with `provinceOptions` and `districtsByProvince` ("Sathon, Bangkok" / "สาทร กรุงเทพฯ").
- `qualification` is a fixed bilingual string ("เกณฑ์ ณ วันที่ส่งคำขอ / Criteria at allocation"). Stop rendering it.
- Format `phone` from E.164 to Thai local display.
- Add `preferredContactMethod` and `lineId` to the projection when those fields were disclosed (they're already stored on `leads`).
- Outcomes today are `open | won | lost`. Add `contacted`, `site_visit` and `quoted` (a migration plus API validation) to power the tracker and the funnel.
- Remove internal labels from the UI ("Notification status: Pending", "Available in portal").

### 8.6 Credits
Dark balance card: "18 credits · Enough for 9 shared enquiries + 1 free enquiry · 2 reserved · no automatic top-up". Package card "20 credits ฿4,000 · 10 shared enquiries · ฿400 each" with **"Pay with PromptPay"** (brand capitalisation) and, while payments are off, "Online payment opens soon. You won't be charged." directly under the button. One statement list (newest first) replaces separate transactions and order history. Format all money with `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })`, which renders ฿4,000, never "THB 4,000.00".

### 8.7 Company
Cards for: accepting switch with explanation; **service areas as province chips** (the data model is province-level `service_provinces_json`, so use chips for the six launch provinces instead of the comma-separated text box); enquiries per day as a stepper; **LINE alerts** card with a pine Connect button; company details form; then disclosures for Credit claims and Installer terms. Toast "Paused. No new enquiries until you turn this back on." when pausing.

### 8.8 Claims, terms, payment status
Restyle with cards and the new type. Payment status with no order should say what to do next ("We couldn't find a payment. Go to Credits to start one.") with a button.

---

## 9. Copy

All new EN/TH copy is in `prototype/app.js`, object `T` (keys `en` and `th`). Use it as the string source; add the strings to `config/i18n.ts` or the components' existing `t(th, en)` helpers. Thai strings are a draft and need native review before launch.

---

## 10. QA checklist (per page, EN and TH, 360 / 390 / 768 / 1440 px)

- [ ] No horizontal scroll; no clipped text; Thai headings don't overlap the next line.
- [ ] One primary button per screen; lime only on dark surfaces.
- [ ] All numbers tabular Manrope; money as ฿ with thousands separators.
- [ ] Focus visible for keyboard users; no outline flash on programmatic heading focus.
- [ ] axe (wcag2a/aa, wcag21aa, wcag22aa) passes. The current site already passes; keep it that way. The prototype passes on all 14 routes at 390 and 1440 px. Inactive mobile tab-bar labels use `--muted`, not a lighter grey.
- [ ] Reduced motion respected.
- [ ] Example figures come from `calculateEstimate()`.
- [ ] No `[PLACEHOLDER]` tokens rendered.
- [ ] Existing Playwright suites updated (headings, button names and copy changed), and still green.

## 11. Do not change

Consent and legal text, contact modes and their fail-closed defaults, D1 versioning, admin, calculator maths, recipient cap logic, ledger and claims logic, staff-link security model.
