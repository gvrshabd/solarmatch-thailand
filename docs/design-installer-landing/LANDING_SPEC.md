# Installer landing page: "Pulse light" with the Glow hero

This spec replaces the **signed-out installer website** (`/installers` when nobody is signed in). It does not cover the portal: the Signal portal on main stays exactly as it is. It supersedes the landing-page part of `docs/design-signal/` (SIGNAL_SPEC §1). Leave that folder unchanged, because it is a preserved record.

| Item | Where |
|---|---|
| Visual reference | `prototype/index.html`. Open it in a browser and use the ไทย / EN toggle. It shows the whole page and both animations. |
| Screenshots | `reference/` (phone 390 px, iPad 1180 × 820, desktop 1440 px, in EN and TH) |
| CSS to port | `prototype/landing.css`: everything below `:root` |
| Markup, copy and behaviour | `prototype/landing.js`: `page()`, `COPY`, `initFeed()`, `initPath()` |
| Code that changes | `components/installers/landing.tsx`, `components/installers/signal-landing-copy.ts`, `app/installers-signal.css`, `tests/unit/signal-landing.test.ts`, plus two new client components (§3, §4) |

---

## 0. Rules

### What must not change

1. **Props and auth.** `InstallerLanding` keeps its props (`en`, `config`, `apply`, `signIn`, `auth`, `setLanguage`). `portal.tsx` keeps building the auth panel and passing it in. Auth modes, fields, messages and `/api/installer-auth/*` stay as they are.
2. **Availability.** These rules stay exactly as they are today:
   - `available = config.accountsAvailable`
   - `canApply = available && config.registrationAvailable === true`
   - Sign in is disabled only when `!available`.
   - When `!canApply`, Apply is disabled and its label reads "Applications unavailable".
3. **Required markup.**
   - Keep the skip link: `<a class="sr skip" href="#installer-landing-main">`.
   - Keep exactly one `<main id="installer-landing-main" tabIndex={-1}>`. `installer-signal.spec.ts` focuses it.
4. **Numbers come from configuration.** Use `config.commercial` (`creditValueMinor`, `sharedCredits`, `recipientLimit`, `trialDeliveries`, `claimDays`). The prototype's ฿400 / 3 / 2 / 7 are stand-ins.
   - Price is `portalMoney(creditValueMinor * sharedCredits, 'THB', en, wholeBahtWhenRound)`, as in the current code.
   - When `commercial` is `null`, show `—` in place of each number.
5. **Example customers are fictional.**
   - They are always labelled **EXAMPLES**.
   - Nothing about them is clickable.
   - There are no `tel:` links.
   - They never come from real data.
6. **Tokens.** Use the repo's `--sm-*` tokens. The prototype's variables map one-to-one (for example, `--stone` is `--sm-stone` and `--night` is `--sm-night`). Add `--sm-night: #0F211B`, `--sm-night-2: #17322A` and `--sm-linegreen: #06C755` if they don't exist yet.
7. **Thai.** Thai copy is a draft for native review; mark it with a code comment. The Thai type rules (no tracking, no uppercase eyebrows, weight 600, line-height 1.28) key off the root's `lang` attribute, which the landing already sets.

### Decisions the owner has made

- **The facts strip is gone.** "฿400 per enquiry / 3 companies at most / 2 free to start / 7 days to claim" now lives in the four questions (§5).
- **The landing FAQ is now these four questions only.** These landing sentences go:
  - "Can I pause?"
  - "Is a sale guaranteed?"
  - "Claims are reviewed; a credit restoration is not a cash refund."
  - "No answer or no purchase does not automatically make an enquiry invalid."

  They still live, unchanged, in the installer terms and in the portal's claim form. Update the unit test (§8) to match. Do not put them back on the landing page.
- **The lede and the "For solar installers" eyebrow prefix are gone.**

---

## 1. Header

Sticky at `top: env(safe-area-inset-top, 0px)`, `rgba(245,244,239,.86)` with a 16 px backdrop blur, and a bottom hairline in `--sm-line`. Its height is 68 px. It contains:

- **Left:** `SignalBrand` (keep the existing component).
- **Nav** (shown at 900 px and up only): **How it works** (`#how`) and **Questions** (`#faq`). **Pricing** goes, because the pricing section no longer exists.
- **Right:** the ไทย / EN toggle, **Sign in** (`btn ghost sm`, class `signin`) and **Apply** (`btn primary sm`). Both buttons keep the existing handlers and disabling.
- **At 440 px and below:**
  - **Sign in** is hidden.
  - The language toggle shows only the *other* language, as one bordered 40 px button.

## 2. Hero

The structure is `.top` (relative, `isolation:isolate`, `overflow:hidden`, stone background). Inside it:

1. **Glow background:** `<div class="glow" aria-hidden="true">` holding four `.blob` spans and one `.grain` span. Use the CSS as written.
   - Four blurred circles drift slowly: lime at top right, gold in the middle, mint at bottom left, white at top centre.
   - Over them sits an SVG-noise grain layer at 22% opacity with `multiply` blending.
   - Phones get smaller blobs.
2. **`.top::after`:** a 160 px gradient from transparent to `--sm-stone` at the bottom. This is the seamless hand-off into How it works, which sits on the same stone colour. Do not give How it works a different background.
3. **`section.hero > .wrap`.**
   - **Layout:** one column on phones; two columns of `1.1fr / .9fr` with a 56 px gap from 960 px.
   - **Height:** from 960 px, the section has `min-height: clamp(600px, calc(100svh - 68px), 860px)` with its content centred vertically. This removes the empty band the owner flagged on iPad.
   - **Copy column:**
     - Eyebrow: "Bangkok & nearby".
     - `h1`: "Get connected with homeowners " followed by `<em>who asked to be called.</em>`. The `em` is `--sm-green` and not italic. Size: `clamp(38px, 5.4vw, 70px)`; Thai uses `clamp(34px, 4.8vw, 60px)`.
     - Buttons: **Apply as a solar installer →** (`btn primary lg`) and **Sign in** (`btn ghost lg`).
     - The ghost button gets a `rgba(255,255,255,.72)` fill with an 8 px blur so it reads over the glow.
     - On phones (below 600 px) both buttons are full width.
   - **Right column:** the examples feed (§3), or the auth panel when `auth` is set.
4. **When auth is open,** the auth panel replaces the feed in the right column. Keep the `.auth` styles that are already in `installers-signal.css`. On phones, hide `.btns` while auth is open so the form sits directly under the `h1`; the current `.authing` rule does this (the lede no longer exists).

## 3. Examples feed: new `components/installers/landing-examples.tsx` (`'use client'`)

1. **Markup:**
   - A `div.feed` with `role="region"` and `aria-label` set to "Example customers".
   - A header holding a pulsing lime dot, `<b>` "Examples" (CSS makes it grey, uppercase and tracked; Thai stays "ตัวอย่าง"), and a pause button on the right.
   - The pause button is `btn ghostd sm fp` with `aria-pressed` and a label that switches between "Pause examples" and "Play examples". Its icon switches between Pause and Play.
   - Then `div.feed-v` (`tabIndex=0`, `role="group"`, same label) holding `div.feed-l`. The list is rendered **twice**, and the second copy is `aria-hidden`.
2. **Card** (`article.pc`):
   - Lime avatar initial (spans two rows), bold name, relative time on the right.
   - Area on the second line, with a round lime phone icon on the right. The icon is decorative, not a link.
   - Tag pills: bill (`฿7,200`), air-cons ("6 air-cons" / "แอร์ 6 เครื่อง") and timeframe.
   - Use the six fictional customers in `EXAMPLES` in the prototype, with Thai names and areas for TH.
3. **Panel:** dark gradient (`--sm-pine-2` to `--sm-night`), 28 px radius, deep shadow.
4. **Direction and size:**
   - **960 px and up:** vertical, with a 440 px viewport faded at the top and bottom by a mask.
   - **Below 960 px:** sideways, slimmer, with thinner cards, using the `@media (max-width:959px)` block as written. Cards are `min(68vw, 256px)` wide with 9 × 11 px padding, a 34 px avatar and the tags on one row.
5. **Behaviour** (port `initFeed()`, using `useEffect`, `useRef` and `requestAnimationFrame`, and cleaning up on unmount):
   - **Speed:** it auto-scrolls at 0.026 px/ms vertically or 0.032 px/ms sideways.
   - **Looping:** when the position passes half the scroll size (one full copy), subtract half. The list's `padding-bottom` and `padding-right` equal the gap so the loop point is seamless.
   - **Pausing:**
     - It pauses while hovered.
     - It holds for 3.5 s after any `wheel`, `touchstart`, `pointerdown` or `keydown` on the viewport.
     - It stops while `document.hidden`.
     - It stops when the pause button is pressed.
   - **Manual scrolling:** the user can scroll it by hand, and the auto-scroll continues from wherever they leave it.
   - **Re-evaluation:** check the axis with `matchMedia('(max-width:959px)')` on every frame.
   - **Reduced motion:** `prefers-reduced-motion: reduce` starts it paused, with the button showing Play.
   - **Server render:** the feed renders at its starting position with no hydration mismatch.

## 4. How it works: new `components/installers/landing-sun-path.tsx` (`'use client'`)

1. **Section:** `section.how#how` on `--sm-stone`, with padding of 32 / 64 px on phones and 48 / 104 px from 900 px. The `h2` is "How it works" with nothing else above or below it.
2. **Steps:** an ordered list:
   1. **Apply**
   2. **Receive customer information**, whose only sub-line is "Through LINE or email", preceded by two decorative 22 px chips. One is a LINE-green tile with a white chat icon; the other is a pine tile with a lime mail icon.
   3. **Call and earn!**, with the `h3` in `--sm-green`

   Thai: สมัคร / รับข้อมูลลูกค้า, sub-line "ผ่าน LINE หรืออีเมล" / โทรแล้วสร้างรายได้!
3. **From 860 px: the arc** (copy the SVG exactly).
   - The SVG has `viewBox="0 0 1000 240"` and `preserveAspectRatio="none"`, and is 100% wide and 240 px tall.
   - It holds two copies of the path `M120,218 Q500,-26 880,218`:
     - a dashed grey base line (`vector-effect="non-scaling-stroke"`);
     - a gold progress line with `pathLength="1"`, `stroke-dasharray="1 1"` and `stroke-dashoffset = 1 − progress`.
   - **Step positions:**
     - `li` 1 at `left:12%; top:198px`
     - `li` 2 at `left:50%; top:76px`
     - `li` 3 at `left:88%; top:198px`

     Each `li` is 30% wide, `translateX(-50%)`, centred, with `z-index:3`.
   - The number circle is 40 px, `position:relative`, `left:auto`, `top:auto`, with a 6 px bottom margin. Its centre therefore lands exactly on the arc at (12%, 218), (50%, 96) and (88%, 218).
   - **Check this with a test or by measuring.** The owner flagged circles drifting off the line. That was caused by the phone rule `left:-54px` leaking into the desktop layout.
4. **Sun.** The `.sun` is 24 px, gold, with a glow, `z-index:2`, and sits **under** the steps. Its scroll progress is `p = clamp(0, 1, (0.85·vh − sectionTop) / (0.55·vh))`.
   - From 860 px, position it at `getPointAtLength(p·length)`, mapping x × width / 1000 and y as is.
   - Below 860 px it moves down the dashed vertical rail on the left (`translateY(10 + p·(listHeight − 20))`).
   - Each step's circle turns gold (`li.lit`) once `p` passes 0.02, 0.5 and 0.98 respectively.
   - Throttle updates with `requestAnimationFrame`, listening to `scroll` and `resize` (passive).
   - With reduced motion, `p` is 1: the sun sits in circle 3 and every step is lit.
5. **Server render:** the sun sits at step 1 with no step lit, so the section is complete before JavaScript runs.

## 5. Questions

1. **Banner:**
   - `section.faq#faq` starts with a **full-bleed** banner, with no side margins or radius.
   - The image is `next/image` `/images/design-v2/roof-tile.jpg` (1200 × 880, `loading="eager"`), with alt text "Solar panels on a tiled roof in a garden".
   - It has a slow Ken Burns zoom (22 s, alternating) and a pine gradient from the bottom.
   - The credit chip "Photo: Kindel Media / Pexels" sits at top right.
   - The `h2` "Commonly asked questions" is white, at the bottom left, inside `.wrap`.
   - The banner is 260 px tall on phones and 380 px from 900 px.
2. **Questions:** below the banner, inside `.wrap`, sit four `details.qa` white cards (radius 18, shadow), with 10 px gaps and a 900 px maximum width, **all closed**.
   - Each summary has a 28 px round sage button showing `+`. It turns to `−` on a lime fill when open.
   - The answer slides in by 6 px.
3. **The four questions:**

| # | Question (EN / TH) | Answer (EN / TH) |
|---|---|---|
| 1 | What does each enquiry cost? / ค่าคำขอเท่าไร? | `{price}` per enquiry. No subscription and no automatic billing. / คำขอละ `{price}` ไม่มีค่าสมาชิกและไม่มีการเรียกเก็บเงินอัตโนมัติ |
| 2 | How many companies get the same homeowner? / มีบริษัทได้รับลูกค้ารายเดียวกันกี่แห่ง? | `{recipientLimit}` at most, including you. / ไม่เกิน `{recipientLimit}` บริษัท รวมคุณด้วย |
| 3 | Is there a free trial? / ทดลองใช้ฟรีได้ไหม? | Yes. Your first `{trialDeliveries}` enquiries are free once you’re approved. / ได้ คำขอ `{trialDeliveries}` รายการแรกฟรีหลังได้รับอนุมัติ |
| 4 | What if a customer’s details are wrong? / ถ้าข้อมูลลูกค้าไม่ถูกต้องล่ะ? | Report it within `{claimDays}` days. If the details are wrong, you get your credits back. / แจ้งเราภายใน `{claimDays}` วัน หากข้อมูลผิดจริง คุณจะได้เครดิตคืน |

Build these in `signalLandingFaq(en, commercial)`, which returns four `[question, answer]` pairs. Drop the old keys (`q5`, `a4`, `a5`, the facts keys, the lede, and the example-card keys you no longer need).

## 6. Footer

Background `--sm-night`, text `--sm-ondark`, padding 40 / 32 px. Inside one row that wraps:

- `SignalBrand` (white).
- A `nav` with six links: How it works (`#how`), Questions (`#faq`), Sign in (the existing button, `tlink` style, same disabling), Homeowner site, Privacy Notice and Terms of use (the existing hrefs). On phones (700 px and below) the nav becomes two columns.
- The fine print "Pre-launch preview." / "ตัวอย่างก่อนเปิดบริการ" on its own line.

**Remove** the footer tagline and the two group headings.

## 7. Remove from the current landing

Remove all of the following, along with their CSS in `installers-signal.css`:

- **Hero:** the lede; the `.stack` / `.notif` example card.
- **Pricing:** the `#price` section (`.a-facts`, `.fgrid`, the "Draft terms…" note) and the Pricing nav link.
- **Old How it works:** the eyebrow, the "From approval to first call." heading, the three paragraphs, and the `.tl` timeline styles.
- **Old questions:** the palms-roof banner.
- **Old footer:** the footer groups.

Keep `.auth` and every portal rule. Grep before deleting a class, because the portal may share `.btn`, `.lang`, `.brand` or `.foot`.

## 8. Tests

Update `tests/unit/signal-landing.test.ts`. Keep its intent and change only what the redesign changes.

- **Sign-in availability:** sign in stays enabled when `registrationAvailable` is false; every account entry point is disabled when `accountsAvailable` is false; "Applications unavailable" is shown.
- **Configured values:**
  - The price, `recipientLimit`, `trialDeliveries` and `claimDays` appear in answers 1–4 in EN and TH (for example, the fixture gives `฿702`, `6 at most`, `first 5 enquiries`, `within 11 days`).
  - Remove the assertions on the removed sentences (see the owner's decisions in §0).
- **Markup:**
  - Exactly 4 `<details class="qa">`, none open.
  - No `href="tel:`.
  - `loading="eager"` and "Photo: Kindel Media / Pexels" on the banner.
  - The skip link, with one `<main id="installer-landing-main" tabindex="-1">`.
  - "Examples" / "ตัวอย่าง" present.
- **Auth:** passing `auth` renders it and does **not** render `.feed`.
- **New tests for the extracted helpers:**
  - The feed's loop arithmetic: the position wraps at half the scroll size.
  - The sun-path progress clamp, and the lit thresholds at 0.02, 0.5 and 0.98.

Update any e2e selectors that pointed at `.a-hero`, `.stack` or `#price`. Never weaken assertions about availability, money or privacy.

## 9. Acceptance

1. **Overflow:** no horizontal scroll at 360, 390, 768, 1180 × 820 and 1440 px, in EN and TH.
2. **iPad, 1180 × 820:** the hero fills the first screen with no empty band, and the glow fades into How it works with no visible edge.
3. **Circle alignment:** at 860 px and above, each step circle's centre is within 1 px of its arc point. Measure it in Playwright.
4. **Phones:** the feed panel and cards match `reference/landing-en-phone.png`, with the panel slimmer than the old Signal card and the cards thinner.
5. **Reduced motion:** the blobs stay still, the feed is paused, and the sun sits at the end.
6. **Accessibility:** axe shows zero violations for wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa and best-practice, in EN and TH, both closed and with a question open.
7. **Checks:** `pnpm lint`, `pnpm typecheck` and `pnpm test` pass, as do the installer Playwright suites (`installer-signal`, `installer-signal-notes`, `installer-workflow`, `installer-studio`, `installer-payment-return`, `installer-repair-portal`).
