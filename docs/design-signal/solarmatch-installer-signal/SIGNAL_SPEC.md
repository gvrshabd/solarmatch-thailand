# SolarMatch for installers: Signal design spec

Signal is the chosen direction (concept A) for the installer website and the installer portal. The idea is simple: **show the product first**. The website leads with what an enquiry looks like. The portal is an inbox: the oldest homeowner who is still waiting sits at the top, and one tap calls them.

This spec replaces sections 5 and 6 of `docs/design-v3/V3_SPEC.md`. Those sections were never built, so there is nothing to undo.

| Item | Where |
|---|---|
| Visual reference | `prototype/`: open `index.html`. The dark bar at the top switches between Website and Portal and between account states. The bar is a prototype tool only. |
| Screenshots | `reference/`, named `{route}-{state}-{lang}-{phone or desktop}.png`. Phone is 390 px wide, desktop is 1440 px. |
| CSS to port | `prototype/signal.css`, from `/* brand */` to the end. Skip the `prototype chrome` block. |
| Markup and copy | `prototype/signal.js`. The `COPY` object holds every string in English and Thai. Each render function shows the markup. |
| Code to change | `components/installers/*.tsx`, `app/installers-v2.css` (or a new `app/installers-signal.css`) and `app/installers/layout.tsx`. |

---

## 0. Rules that apply everywhere

### What must not change

None of the following change:

- **API contracts:** the `/api/installer/portal` actions and response shape, and `/api/installer-auth/*`.
- **Permissions:** the `emailVerified` gating, the approved-only controls, `availability.canManage`, owner-only errors, `busy` disabling.
- **Payments:** the Omise checkout, the server-confirmed status, `reconcile-order`.
- **Claim rules and deadlines.**
- **Notes revision conflicts.**
- **Share-link behaviour and withdrawal handling.**
- **Terms text.**

The strings listed in §9.2 must stay word for word. They may move into a disclosure or onto a different screen.

### Tokens

The prototype's variables map one-to-one onto the repo's `--sm-*` tokens. For example, `--stone` becomes `--sm-stone`, `--pine` becomes `--sm-pine` and `--line-2` becomes `--sm-line-2`. Use `--sm-shadow` for `--shadow`. `--ink` is `--sm-pine`.

The prototype introduces no new colours. These are the stage pill colours:

| Stage | Background | Text |
|---|---|---|
| New | gold-soft | `#6E4C0E` |
| Contacted | `#E2ECF7` | `#244E7A` |
| Site visit | `#DDF1EE` | `#1D5F57` |
| Quoted | `#ECE7F8` | `#4D3B86` |
| Won | `#E1F1E6` | `#1C6A3F` |
| Lost, Not suitable | `#ECEDEA` | `#5B6A61` |

### Scope the CSS

Scope the CSS to avoid clashes with the homeowner site. Put the ported rules in `app/installers-signal.css`, import it last in `app/installers/layout.tsx`, and prefix every selector with a root class (`.signal`) placed on the landing and portal roots.

Delete the v2 installer rules that are no longer used. Do not delete rules that the homeowner site uses.

### Type

- Fonts: Manrope and Anuphan, which are already loaded.
- Thai (`html[lang=th]` or the portal's `lang` attribute):
  - headings at weight 600, line-height 1.3, letter-spacing 0;
  - eyebrows not uppercased and not tracked;
  - the hero H1 one step smaller.
- The rules are at the top of the `Signal additions` block.

### Layout

| Area | Widths and behaviour |
|---|---|
| Portal, phone | Below 1000 px: bottom tab bar, one column. |
| Portal, desktop | 1000 px and up: dark left rail, 380 px list, detail pane. |
| Website | Hero splits at 960 px; the facts strip becomes 4 columns at 860 px. |

There is no horizontal scroll at 360, 390, 768 or 1440 px. Rows never wrap and leave an orphan button; the prototype uses full-width buttons, or a single row that shrinks.

### Language

- The default is Thai. `?lang=en` gives English, as today.
- The toggle appears in the website header and in the portal's account menu.
- The Thai copy in `COPY.th` is a draft. Flag it for native review.

### Numbers come from configuration

Never hard-code ฿400, 3, 2 or 7. Use `InstallerPublicConfig.commercial` on the website and `data.commercial` in the portal:

| Value | Source |
|---|---|
| Price | `creditValueMinor * sharedCredits` |
| Companies | `recipientLimit` |
| Free enquiries | `trialDeliveries` |
| Claim window in days | `claimDays` |
| "Up to N other companies" | `recipientLimit - 1` |

If `commercial` is missing, show `—` as the current landing does.

### Icons

Use lucide equivalents: `Phone`, `MessageCircle` (LINE), `Copy`, `Inbox`, `Wallet`, `Building2`, `Clock`, `Search`, `AlertCircle`, `Info`, `Mail`, `ChevronRight`, `ChevronDown`, `ArrowLeft`, `ArrowRight`, `Check`, `X`.

---

## 1. Website (signed out): `components/installers/landing.tsx`

Reference: `landing-en-*`, `landing-th-*`, `signin-en-*`.

1. **Header.** Make it sticky, with a translucent stone background and a bottom hairline. It contains:
   - the brand (logo, "SolarMatch", "FOR INSTALLERS");
   - nav links that scroll to sections: How it works, Pricing, Questions. These show at 900 px and up only;
   - on the right, the language toggle, **Sign in** (ghost, hidden at 420 px and below) and **Apply** (primary).

   At 420 px and below, the language toggle shows only the other language as a single bordered button.
2. **Hero.** The background is stone with a soft gold radial at the top right. There is no photograph.
   - **Left:**
     - eyebrow;
     - H1 "Homeowners who already know their numbers." (the existing `iH1`);
     - the one-sentence lede;
     - **Apply as an installer** (primary, with an arrow) and **Sign in** (ghost). These are full width on phones.
   - **Right:** the example enquiry card.
     - The card has a white stack with two ghost layers under it (`::before` and `::after`) and the "Example" tag.
     - Inside: a live dot with "New enquiry · just now", the avatar, name and area, a 2×2 mini facts grid, and Call and Copy buttons, mirroring the portal.
     - The buttons are inert spans, not links.
     - The card plays a one-off rise animation. Respect `prefers-reduced-motion`.
3. **Facts strip.** Four white cells inside one rounded card: price per enquiry, companies at most, free to start, and days to claim wrong details. It is 2×2 on phones and 4 across from 860 px. Under it goes the one-line note "Draft terms. No subscription and no automatic billing."
4. **How it works.** Sage band with:
   - eyebrow;
   - H2 "From approval to first call.";
   - a numbered timeline of 3 steps: Apply, Get LINE alerts, Call and track.

   On phones the connector line runs vertically. From 860 px it runs horizontally.
5. **Questions.**
   - **Banner:** the existing `public/images/design-v2/palms-roof.jpg` as the photo banner, titled "Commonly asked questions", with the Kindel Media / Pexels credit chip. Do not lazy-load this image.
   - **Questions (5, all closed):** What do I pay? / How many other companies get the same homeowner? / What if the details are wrong? / Can I pause? / Is a sale guaranteed?
   - The answers that state numbers must use the config values.
   - The answers to "Is a sale guaranteed?" and the claim sentence keep the existing legal wording (§9.2).
6. **Footer.** Pine background with the brand and a one-line tagline, then two even groups of three links:
   - Installers: How it works, Pricing, Sign in.
   - SolarMatch: Homeowner site, Privacy Notice, Terms of use.

   Below them: "Pre-launch preview. Draft terms." Render it as `<footer className="foot"><div className="wrap">` so it spans the page.
7. **Remove:**
   - the hero photograph and the sample-enquiry overlay;
   - "Fair by design" and its table;
   - the closing dark CTA band;
   - the "Subject to approval…" note. The facts note replaces it.
8. **Sign in and Apply.** The existing `auth` panel moves into the hero's right column, replacing the example card.
   - It is the card from `authCard()`: a close (×) button back to the example, a heading, the existing fields with unchanged names, autocomplete, length rules and `minLength` of 12, a full-width **Continue** button, the existing mode links, and the existing note.
   - On phones the hero hides the lede and buttons while the panel is open (`.authing`), so the form sits right under the H1. Keep the existing scroll-into-view.
   - The modes stay the same: login, register, recovery and reset.
   - After register or recovery, show the "Check your email" state inside the card using the existing messages. The prototype adds an extra sentence for register; add it only if the flow really sends the link to that address.
   - When `accountsAvailable` is false, Apply and Sign in are disabled and the primary label reads "Applications unavailable", as today.

---

## 2. Portal shell: `portal.tsx` and `PortalNavigation` in `workspace.tsx`

Reference: `inbox-en-*` and `inbox-account-menu-en-*`.

1. **Views.** Remove the **Today** view (`PortalOverview`). The Enquiries list sorted by waiting time does its job, and its "Call next" card, "Also waiting" list and side tiles duplicate other screens.
   - `?view=overview` and a missing view both render `inbox`.
   - Keep `credits`, `profile` (labelled Company), `claims` and `terms`.
2. **Desktop (1000 px and up).**
   - **Grid:** a 92 px pine rail, then the main area.
   - **Rail** (a `<header>` element, sticky, full height):
     - the logo, linking to `/installers`;
     - a `<nav>` with three items (Enquiries, Credits and Company), each an icon with a label underneath. The active item gets a lime tint. Enquiries shows a gold count badge with the number of waiting enquiries, for approved companies only;
     - the account avatar at the bottom.
   - **Columns:** the list column is white with a right hairline. The detail pane is stone. Both run the full page height (see the `.a-app:has(.a-split)` background rule).
3. **Phone.**
   - A fixed bottom tab bar with the same three items and the badge, frosted white, with safe-area padding.
   - The page head on each view carries the account avatar:
     - on Enquiries it sits left of the company name;
     - on Credits and Company it sits right of the H1.
4. **Account menu.** A `<details class="acct">` that replaces `v2-account-menu`. It contains, in order:
   - the company name (or the user name before a company exists) and the email;
   - Language, with the ไทย / EN toggle;
   - Homeowner site;
   - Sign out (the existing `signOut`).

   It closes on Escape and on a click outside. On desktop it opens to the right of the rail.
5. **List head.** This replaces the `.phdr` header bar. It contains:
   - the company name;
   - a status line with a coloured dot (see the table below);
   - the **Accepting enquiries** switch on the right.

   The status line shows the first row that applies:

   | Condition | Dot | Text |
   |---|---|---|
   | No company yet | grey | "Set up company" |
   | Approval status is not `approved` | gold | "Under review" for `pending`, otherwise `statusLabel(approvalStatus)` |
   | `availability.platformPaused` or `allocationPaused` | grey | "Paused by SolarMatch" |
   | `company.paused` | grey | "Paused" |
   | Otherwise | green | "Accepting enquiries" |

   - The switch appears for approved companies only.
   - It uses `role="switch"`, `aria-checked={!paused}` and the accessible name "Accepting enquiries", with the `set-accepting` action.
   - Disable it when `busy`, when `!emailVerified`, or when `canManage === false`, as today.
   - Show the success toasts from the prototype.
6. **One notice at a time.** Show it under the list head, or under the page H1 on other views. Only the first one that applies appears:

   | Priority | Condition | Text key | Action |
   |---|---|---|---|
   | 1 | Email not verified | `nVerify` | — |
   | 2 | Terms not accepted | `nTerms` | Review terms, links to `?view=terms` |
   | 3 | Platform or allocation paused | `nPlatform` (existing wording) | — |
   | 4 | `balance.debt > 0` | `nDebt` | Credits |
   | 5 | No spendable credits or trial left | `nEmpty` | Top up |

   - Gold style for alerts, sage for info.
   - Hide the action button when you are already on its target view.
   - The detailed debt explanation moves onto the Credits balance card (§6).
   - For unapproved companies, the notices about company setup and approval are replaced by the checklist in §5.
7. **Messages.**
   - Success messages ("Saved.", link created, claim submitted) show as a toast at the bottom centre with `role=status`, placed above the tab bar on phones.
   - Errors from `portalErrorMessage` stay inline as an alert-style notice, with unchanged text.
8. **Loading and unavailable.** Keep the skeleton. Restyle the 503 state as a centred white card with the existing text and the Retry button.
9. **Delete:**
   - the sidebar note "Your next connection starts here.";
   - the per-page footer disclaimer (keep it once on Terms, §8);
   - the page-title welcome block;
   - the secondary claims/terms nav (Company links to both, §7).

---

## 3. Enquiries list: `PortalInbox` and `EnquiryCard` in `workspace.tsx`

Reference: `inbox-*` and `e39-*`.

1. **Head.**
   - The list head (§2.5).
   - A notice, if any.
   - H1 "Enquiries". On an enquiry URL this is an `h2`, because the homeowner's name becomes the `h1`.
   - A 3-way segmented control, each segment with its count. Use `role="group"` with `aria-pressed` buttons:
     - **Waiting** is `enquiryGroup === 'new'`.
     - **Active** is `'progress'`.
     - **Closed** is `'closed'`, which includes withdrawn enquiries.
   - Drop "All".
   - The search field below, with the same matching rules as today.
2. **Order.** Waiting is oldest first (who has waited longest). Active and Closed are newest first.
3. **Keep the segment in the URL** (`?tab=waiting|active|closed`, default `waiting`). On an enquiry URL with no `tab`, the default is that enquiry's group. Keep `lang` on every link.
4. **Row** (`.row`, replacing `EnquiryCard`). The row is one `<a>` to the enquiry. It contains:
   - an avatar initial;
   - a top line with the bold name and the waiting time from `waitingTime()`, right aligned. The time is gold and bold when the enquiry is waiting;
   - a second line with the area (`deliveryLocation`) and the bill (`฿7,200`). When `billInputStatus === 'not-supplied'`, show `620 kWh` from `monthlyConsumptionKwh` instead;
   - a third line of pills: **Waiting**, or the stage pill, plus **Free trial** when `fundingSource === 'trial'`.

   Waiting rows have a small gold dot on the left. The selected row (the current enquiry, desktop only) has a `#EEF4E4` background. Rows are separated by an inset hairline.
5. **No homeowner LINE contact.** The concept preview had a LINE pill and button for homeowners who prefer LINE. **Today's portal contract has no such field** (`preferredContactMethod` and `lineId` exist only on the server), so the prototype leaves them out. If a separate, privacy-reviewed change later adds a permitted field to `InstallerDelivery`, add a soft **LINE** button between Call and Copy, and a green LINE pill on the row. Do not add it in this work. LINE *alerts* for the installer (Company → LINE alerts) are unaffected.
6. **Withdrawn row.** A grey "—" avatar, the bold muted text "Access withdrawn", the time, and the reference on the second line. No personal details.
7. **Empty states.** Show one muted line in the list, mirrored in the desktop detail pane:

   | Situation | Text key |
   |---|---|
   | No deliveries at all | `emptyNew` |
   | Waiting is empty while accepting | `emptyWaiting` |
   | Waiting is empty while paused | `emptyPaused` |
   | Active or Closed is empty | `emptyNone` |
   | Search has no match | `emptySearch` |

8. **Split view on desktop.** Both `/installers?view=inbox` and `/installers/enquiry/[id]` render the list and the detail side by side.
   - On `/installers?view=inbox` at 1000 px and up, open the first row of the current segment with `router.replace`. Run this only when `matchMedia('(min-width:1000px)')` matches.
   - If the segment is empty, the pane shows the empty line.
   - On phones the inbox shows only the list, and the enquiry URL shows only the detail. Use the `detail-open` class: the list and tab bar are hidden and the call bar is shown.
9. **Delete** the "{n} results · Oldest first" line and the 2-column card grid.

---

## 4. Enquiry detail: `enquiry-detail.tsx`

Reference: `e39-*` (waiting), `e41-th-*` (kWh fallback, Thai), `e22-*` (won), `e25-*` (withdrawn) and `e39-close-menu-*`.

1. **Top line.** "← Enquiries" goes back to the list with the same `tab` and `lang`. It is hidden but keeps its space on desktop. The reference number sits on the right.
2. **Person.**
   - A large avatar and the name as the `h1`, which receives focus on load. If the name is empty, use the reference.
   - Under the name: the area, then on phones only `· 081 234 5678` using `thaiPhone`.
   - A chip:
     - "Waiting 12 min" (gold) while the enquiry is in the Waiting group;
     - otherwise "Received 3 h ago".
   - On phones the chip sits on its own line, aligned with the name.
3. **Contact.**
   - **Desktop:** one row. The first item is the primary `tel:` link showing the number (`thaiPhone`), which grows to fill the row. The second is **Copy**.
   - **Phone:** a fixed bottom call bar replaces the row. It holds **Call {name}** (a `tel:` link, flexible width) and a square Copy icon button (`aria-label="Copy"`).
   - **Copy:** keep the existing clipboard call and its manual-copy fallback (the read-only input and the status message).
   - Calling must never change the stage.
4. **Facts.** A 2×2 white grid (`facts4`):
   - monthly bill, or monthly use in kWh when the bill wasn't supplied;
   - air-conditioners;
   - ownership;
   - timeframe.

   Take values and labels from `assessmentRows()`. Use the short labels from the prototype.
5. **Progress card** (`h2` on the enquiry page).
   - **Top line:** the title on the left, the current stage pill on the right.
   - **Bar:** five segments, filled up to the current stage. Grey fill for Lost or Not suitable.
   - **Labels:** under the bar, five **buttons**: New, Contacted, Site visit, Quoted, Won.
     - Each uses `aria-pressed` and is at least 32 px tall.
     - Tapping one sets that stage with `report-outcome`.
   - **Actions:**
     - **Open stages:** one primary next-step button (labels below) plus **Close ▾**, a `<details>` menu offering Lost and Not suitable.
     - **Closed stages** (won, lost, not-suitable, not-interested): instead of the buttons, one muted line, "Sale agreed. Tap a stage to change it." or "Closed as "{stage}". Tap a stage to reopen."
     - Next-step labels: Mark as contacted, then Site visit booked, then Quote sent, then Mark as won.
   - **Value mapping:**

     | Prototype stage | `report-outcome` value |
     |---|---|
     | New | `open` |
     | Contacted | `contacted` |
     | Site visit | `site_visit` |
     | Quoted | `quoted` |
     | Won | `won` |
     | Lost | `lost` |
     | Not suitable | `not-suitable` |

     An outcome of `null` or `not-recorded` counts as New.
   - Everything is disabled while `busy`, when the email isn't verified, or when `canManage === false`, as today.
6. **Notes.**
   - The label is "Notes for your team". Keep the existing placeholder (it is the data-minimisation prompt) and `maxLength` of 2000.
   - **Remove the Save button.** Save on blur, only when the text has changed, using `save-team-notes` with the current `notesRevision`.
   - The status line under the field reads, in turn: "Saved automatically.", "Saving…", then "Saved 14:32" in Bangkok time.
   - On a 409 the line shows the existing conflict message, and the typed text stays in the field.
   - Before the email is verified, the field is disabled and the line reads "Verify your email to edit notes."
7. **Disclosures.** One card, three `<details>`, all closed:
   - **More about the home:** the remaining `assessmentRows()` (not the four facts) as label/value rows.
   - **Share with a team member:** the existing paragraph word for word.
     - With no link: **Create link** (`rotate-share-link`).
     - After creating one: a read-only link field with **Copy link**, then **Create replacement link** and **Revoke link** in a button row that goes full width when it wraps.
     - Not shown when the enquiry is withdrawn.
   - **Problem with this enquiry?:**
     - "Submit by {deadline}." followed by the existing sentence about no answer or no purchase.
     - The existing reason select (same values), Supporting information (required, 2000 characters) and **Submit claim**.
     - After the deadline: the existing "window has closed" text.
     - After submitting: a green "Claim submitted" pill.
8. **Meta line** (muted, under the cards): "Available in portal 27 Oct, 09:48 · 2 credits · up to 2 other companies may also call". For trial deliveries, use "Free trial" in place of the credits.
9. **Withdrawn enquiry.**
   - A card with the `h1` "Access withdrawn" and the existing withdrawal paragraph word for word.
   - Then only the Problem disclosure, then the meta line.
   - No call bar, no notes, no share link.
10. **Not available.** Keep the existing "This enquiry is not available to your company." as a card.

---

## 5. Setup and review checklist (companies that aren't approved)

Reference: `inbox-pending-en-*`, `inbox-nocompany-th-*`.

The checklist replaces the Enquiries content while there is no company or `approvalStatus !== 'approved'`. The list head stays, without the switch, followed by one white card.

1. **Heading copy.**
   - **No company:** eyebrow "Welcome", `h1` "Set up your company.", and one sentence. The primary button **Add company details →** goes to Company.
   - **Pending:** eyebrow "Your application", `h1` "We're reviewing your company.", and one sentence.
   - **Other statuses:** the same layout, with `statusLabel(approvalStatus)` as the eyebrow.
2. **Checklist items.** Each item shows a filled green check when done, an empty ring when not, and an action on the right when one exists:

   | Item | Done when | Action when not done |
   |---|---|---|
   | Verify email | `emailVerified` | — |
   | Company details | a company exists | Add |
   | Service areas | `serviceAreas.length` | Add |
   | Accept installer terms | `terms.acceptedAt` | Review (only when a company exists) |
   | Connect LINE alerts (Optional) | `lineLinked` | "After approval" |
   | SolarMatch approval | approved | "In review" |

3. This replaces the "Your next steps" checklist in `PortalOverview`.

---

## 6. Credits: `credits.tsx`

Reference: `credits-en-*`, `credits-payment-en-*`, `credits-debt-th-*`.

1. **Layout.** Phone head: H1 "Credits" with the avatar. Then a notice, if any. Then a two-column row that stacks below 760 px: the balance card on the left and the package or QR card on the right. Then the statement card.
2. **Balance card.**
   - Pine gradient with a lime "AVAILABLE" eyebrow and a 64 px number followed by "credits".
   - Then "Enough for {n} enquiries", where n is `floor(available / sharedCredits)`, or 0 when there is debt.
   - Chips appear only when the value is non-zero: "{n} free trials left", "{n} reserved" and "{n} owed". The owed chip is gold.
   - When there is debt, add the existing debt paragraph word for word, in small text.
3. **Package card** (one per package).
   - **Price line:** "{credits} credits" and the price (`portalMoney`, whole baht).
   - **Muted line:** "{credits / sharedCredits} enquiries at {price per enquiry} each".
   - **Buttons:** one full-width **Pay with {method}** per `integrations.paymentMethods`, with the same labels and disabling rules as today.
   - **Notes:**
     - when payments are off: "Online payment opens soon. You won't be charged.";
     - when not approved: "Available after approval.";
     - then the existing charging note;
     - then `taxLabel`, unless it is still the bracketed placeholder `[TAX TREATMENT TO BE CONFIRMED]`. The terms page still shows it.
4. **QR card.** When a PromptPay QR exists (`qrImage`, today shown at the top of every view), show it in Credits in place of the package card. It contains:
   - "Scan to pay";
   - the provider QR (with the existing alt text);
   - the amount;
   - the existing confirmation sentence;
   - **Check status** (`reconcile-order` for that order).

   After checkout, navigate to `?view=credits`.
5. **Statement.** One row per event (keep `creditStatement()`). Each row shows a bold label, then a muted line with the date. Order rows add the status pill, method and amount. On the right is **one** signed amount:
   - the available change (`+20`, `−2`);
   - or for trial grants and trial deliveries: "+2 free" or "Free";
   - or "{±n} reserved" or "{±n} owed" when only those change;
   - "Check status" (`reconcile-order`) appears only for pending, authorizing and reconciliation-required orders.

   **Delete** the four-part "Available · Reserved · Trial · Debt" line.

---

## 7. Company: `company.tsx`

Reference: `company-en-*`, `company-nocompany-th-*`.

1. **Remove** the "Accepting enquiries preference" card. The switch lives only in the list head. Also remove the "Shared residential enquiries · up to 3 companies per request" note.
2. **Service areas card.** The `h2` on the left, "{n} selected" on the right. Below it, a grid that is 2 columns on phones and 3 from 640 px:
   - one tile per launch province, with a check icon when selected (`aria-pressed`);
   - extra areas as selected tiles with ×;
   - the existing "Add another province or area" disclosure under the grid;
   - "Choose at least one area" when nothing is selected.
3. **Enquiries per day card.** The title on the left and a stepper on the right (0–100, with − and + buttons and labels). The subtitle goes. "0 pauses new deliveries." appears only when the value is 0.
4. **LINE alerts card.** Title plus "New enquiries in LINE, straight away." On the right:
   - **Connect** (primary small, existing `link-line` rules), or "Available after approval." when not approved;
   - when connected, a green "Connected" pill plus a quiet **Disconnect** text button. Tapping it shows the existing warning paragraph with **Disconnect LINE** and **Cancel**;
   - when `lineConfigured` is false, disable Connect.
5. **Company details card.** Company name, contact name and company phone, with the existing validation.
6. **Saving.** One form, one `update-company` with areas, limit and details. When something has changed, a save bar appears:
   - on phones, fixed above the tab bar;
   - on desktop, a sticky white pill at the bottom of the page;
   - it reads "Unsaved changes" and has **Save changes**.

   Saving stays disabled when the email isn't verified or no area is chosen.
7. **Create mode** (no company). The H1 is "Set up your company". There is no save bar; the details card ends with **Create company**, which calls `create-company` with `paused: true`, unchanged.
8. **Links card.**
   - **Credit claims**, with the claim count and a chevron, opens `?view=claims`.
   - **Installer terms** shows "Accepted 2 Oct", or a gold "Action needed" pill, and opens `?view=terms`.

   Desktop (1100 px and up): areas span both columns. Below them, per-day and LINE sit side by side, then details and links.

---

## 8. Claims and terms

Reference: `claims-en-*`, `terms-terms-th-*`.

Both pages start with "← Company", then the H1 (with the avatar on phones).

- **Claims:**
  - the existing intro sentence;
  - one card listing each claim: the reason in bold, then a muted line with reference · status · date, then an **Open enquiry** link (no wrap) when the delivery still exists;
  - "No claims yet." when empty.
- **Terms:**
  - one card with the muted version line, then `terms.textEn` or `terms.textTh` unchanged;
  - then **Accept these terms** (existing rules) or a green "Accepted: {date}" pill;
  - then the portal disclaimer and "All times are Bangkok time". Terms is the only page that shows them.

---

## 9. Copy

### 9.1 New or changed strings

All new and changed strings are in `COPY.en` and `COPY.th` in `prototype/signal.js`. Use the same keys as comments, or the existing inline `t(th, en)` pattern in portal components and `designText` keys for the landing.

### 9.2 Keep word for word

These may move but must not be reworded:

- Share-link paragraph (`shareP`).
- Withdrawal paragraph (`wdP`).
- Debt explanation (`crDebtP`).
- Claim rule "No answer or no purchase…" (`claimRule`).
- Claim-window-closed text.
- LINE disconnect warning (`lineWarn`).
- Charging note (`payRule`).
- QR confirmation (`qrP`).
- Platform-paused sentence (`nPlatform`, which matches the current Thai).
- Auth note (`aNote`).
- "Check your email to continue if this account exists."
- The "Is a sale guaranteed?" answer.
- Portal disclaimer and Bangkok-time line (`fine1`, `fine2`).
- All `portalErrorMessage` texts.
- Terms text.
- Claims intro (`clP`).

### 9.3 Delete

- "Your next connection starts here."
- "{n} results · Oldest first"
- "Opening or calling does not record a successful contact."
- "Accepting preference"
- "Does not override platform pauses or eligibility"
- "0 means no new deliveries. Range: 0–100." (replaced by the 0-only hint)
- "Notifications depend on business hours and platform settings"
- "Payments are not enabled."
- "Fair by design." and its table
- The landing's closing band
- "Subject to approval, current terms and delivery availability. No automatic billing."
- "Trial allowances are separate from purchased credits." (now covered by the chips and the debt text)

---

## 10. Acceptance checks

1. **Overflow.** No horizontal scroll at 360, 390, 768 and 1440 px, in English and Thai, on every view and state in `reference/`.
2. **Phone, 390 px.** On the inbox, the company line, the H1, the segments, search and the first row are visible without scrolling. On the enquiry, the call bar is always visible.
3. **Desktop, 1440 px.**
   - The rail, list and detail are visible together.
   - The list scrolls on its own.
   - Opening `/installers?view=inbox` shows the oldest waiting enquiry in the pane.
4. **axe.** No violations for wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa or best-practice. That means:
   - one `h1` per view, and focus moves to it on view change;
   - the rail is a `<header>`, the nav is a `<nav>` with a label, and main content is in `<main>`;
   - the switch, segment, area and stage buttons expose their state;
   - menus close on Escape;
   - touch targets are at least 32 px for stage labels and at least 40 px everywhere else.
5. **States.** Every row of the state table in §2.6 and every checklist item in §5 renders as in `reference/`:
   - approved;
   - empty;
   - paused;
   - platform-paused;
   - unverified;
   - terms;
   - no credits;
   - debt;
   - payment QR;
   - pending;
   - no company;
   - withdrawn.
6. **Behaviour that must not change.** These existing behaviours must still work:
   - stage changes, which always send `report-outcome`;
   - notes, which never save without a revision and keep the typed text on a 409;
   - claims, which respect the deadline;
   - share links;
   - checkout and reconcile;
   - LINE link and unlink;
   - accept-terms;
   - sign-out;
   - language switching, which keeps `lang` on every link.
7. **Tests.**
   - Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the installer Playwright suites: `installer-workflow`, `installer-studio`, `installer-request-lifecycle`, `installer-payment-return` and `installer-repair-portal`.
   - Update selectors and the removed Today view in `installer-workflow.spec.ts` and `installer-studio.spec.ts`.
   - Never weaken an assertion about permissions, money, claims or privacy.
