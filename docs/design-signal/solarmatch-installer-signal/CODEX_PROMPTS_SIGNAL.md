# Prompts for ChatGPT / Codex: installer Signal

Before you start, copy this folder into the repo as `docs/design-signal/`.

Run the prompts in order, one per branch or session. After each prompt, open the changed screens at 390 px and 1440 px, in English and Thai, and compare them with `docs/design-signal/prototype/` (open `index.html`) and `docs/design-signal/reference/`. The dark bar at the top of the prototype switches between Website and Portal and between account states. It is a prototype tool, not part of the product.

Paste this preamble at the top of every prompt:

> Read `docs/design-signal/SIGNAL_SPEC.md` §0 and §9–10 first; they apply to everything. The visual reference is `docs/design-signal/prototype/` (vanilla JS). The CSS to port is `prototype/signal.css` from `/* brand */` to the end, excluding the `prototype chrome` block. Put it in a new `app/installers-signal.css`, imported last in `app/installers/layout.tsx`, scoped under a `.signal` root class, using the repo's `--sm-*` tokens. Markup and every EN/TH string are in `prototype/signal.js` (`COPY.en`, `COPY.th`). Follow each component's existing copy pattern: inline `t(th, en)` in the portal, `designText` in the landing. Mark the Thai as needing native review in a code comment. Do not change API contracts, permissions, payment, claim, notes-revision, share-link, withdrawal or terms behaviour. Strings in SIGNAL_SPEC §9.2 stay word for word. Never hard-code commercial numbers: use `commercial`. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the installer Playwright suites. Update selectors, never weaken assertions.

---

## Prompt 1: installer website and sign-in panel

> Implement SIGNAL_SPEC §1 in `components/installers/landing.tsx`, plus the auth panel markup in `components/installers/portal.tsx`.
>
> **Header.** Sticky, with the brand, section links (900 px and up), the language toggle, Sign in and Apply.
>
> **Hero.**
> - Left: eyebrow, the existing `iH1`, a one-sentence lede, and Apply / Sign in buttons.
> - Right: the "Example" enquiry card, with stacked ghost layers, inert Call / Copy, and a rise animation that respects reduced motion.
>
> **Sections, in order.**
> - The 4-cell facts strip from `commercial`, with the draft-terms note.
> - The sage How it works timeline.
> - The palms-roof photo banner "Commonly asked questions" with 5 FAQs, all closed and not lazy-loaded.
> - The two-group pine footer.
>
> **Remove:**
> - the hero photo and its sample overlay;
> - "Fair by design";
> - the closing band;
> - the "Subject to approval…" note.
>
> **Auth panel.** Restyle it as `.auth` in the hero's right column:
> - an × button back to the example;
> - a heading, then the existing fields with unchanged names, rules and autocomplete;
> - a full-width Continue button;
> - the mode links and the existing note.
>
> On phones, add `.authing` to the hero so the lede and buttons hide while the panel is open. Keep all auth logic, the modes, the messages and `accountsAvailable` handling.
>
> **Acceptance.**
> - 390 px: H1, both buttons and the top of the example card are on the first screen.
> - 360 px: no horizontal scroll.
> - 1440 px: matches `reference/landing-en-desktop.png` and `signin-en-desktop.png`.

## Prompt 2: portal shell, rail, tab bar, list head and notices

> Implement SIGNAL_SPEC §2 in `components/installers/portal.tsx` and `workspace.tsx`.
>
> **Remove the Today view.** Map `overview` and a missing view to `inbox`, and delete `PortalOverview`'s Call-next and Also-waiting UI.
>
> **Desktop shell (1000 px and up).**
> - A 92 px pine `<header class="a-rail">` with the logo, a labelled `<nav>` (Enquiries with the gold waiting badge, Credits, Company) and the account `<details>` menu at the bottom.
> - The menu holds the name and email, the ไทย / EN toggle, Homeowner site and Sign out. It closes on Escape and on an outside click.
>
> **Phone shell.** A fixed frosted bottom tab bar with safe-area padding.
>
> **List head.** Replace the `.phdr` header with the list head:
> - company name;
> - status line using the dot and text table in §2.5;
> - the "Accepting enquiries" switch, approved companies only, with the same action and disabling rules.
>
> **Notices.** A single priority notice (§2.6) under the list head or page H1:
> - Gold or sage style, with an action link that hides on its own target view.
> - Success messages become a bottom toast with `role=status`.
> - `portalErrorMessage` errors stay inline with unchanged text.
>
> **Also:**
> - Move the PromptPay QR into the Credits view (Prompt 4 styles it). For now, render it only on `view=credits`, and navigate there after checkout.
> - Restyle the 503 state as a centred card.
> - Delete the sidebar note, the welcome title block, the per-page footer disclaimer and the claims/terms secondary nav.
>
> **Acceptance.**
> - Every portal view has one `h1` that receives focus on view change.
> - axe best-practice has no `region` violations.
> - The badge counts only `enquiryGroup === 'new'` for approved companies.

## Prompt 3: enquiries list, split view and enquiry detail

> Implement SIGNAL_SPEC §3 and §4 in `workspace.tsx` (`PortalInbox`, replacing `EnquiryCard` with the `.row` markup) and `enquiry-detail.tsx`.
>
> **List.**
> - H1 "Enquiries", or an h2 on enquiry URLs.
> - Waiting / Active / Closed segments with counts, using `aria-pressed`. Drop "All". Keep the segment in `?tab=`.
> - Search with the existing matching.
> - Order: Waiting oldest first; Active and Closed newest first.
> - Rows: avatar; bold name with the time (gold when waiting); area · bill, or kWh when `billInputStatus === 'not-supplied'`; then Waiting / stage / Free trial pills.
> - Waiting rows get a gold dot. The selected row is tinted on desktop.
> - Withdrawn rows show "Access withdrawn" and the reference only.
> - Use the empty-state lines from §3.7.
> - No homeowner LINE pill or button (§3.5).
>
> **Split view.** Both `/installers?view=inbox` and `/installers/enquiry/[id]` render the list and detail side by side at 1000 px and up. Desktop `view=inbox` replaces the URL with the first row of the current segment. On phones, the enquiry route shows only the detail, with the fixed call bar.
>
> **Detail.**
> - Back link (phones), reference, the name as h1, and the area, plus the number on phones.
> - The "Waiting …" or "Received … ago" chip.
> - On desktop, the full-width `tel:` button with the formatted number plus Copy, keeping the manual-copy fallback.
> - The 2×2 facts from `assessmentRows`, with the kWh fallback.
> - The Progress card:
>   - a 5-segment bar;
>   - five stage-label buttons that send `report-outcome`, mapped as `new→open` and `visit→site_visit`;
>   - one next-step button plus a **Close ▾** menu offering Lost and Not suitable;
>   - a muted closed line for won, lost and not-suitable.
> - Notes autosave on blur with `notesRevision`. The status line shows Saved automatically / Saving… / Saved HH:MM. On 409 it shows the existing message and keeps the user's text. Remove the Save button.
> - One disclosures card:
>   - More about the home;
>   - Share with a team member: create, then link field + Copy link, then replace and revoke, with the existing paragraph;
>   - Problem with this enquiry?: the existing claim form and deadline logic.
> - The meta line.
> - The withdrawn layout from §4.9.
>
> **Acceptance.** Match these references: `inbox-*`, `e39-*`, `e41-th-*`, `e22-*`, `e25-*` and `e39-close-menu-*`. Calling never changes the stage. All actions stay disabled when `busy`, when the email isn't verified, or when `canManage === false`.

## Prompt 4: credits

> Implement SIGNAL_SPEC §6 in `components/installers/credits.tsx`.
>
> **Balance card.**
> - Pine card: AVAILABLE, the big number, then "Enough for N enquiries".
> - Chips for trial, reserved and owed, only when non-zero.
> - The existing debt paragraph when there is debt.
>
> **Package card.** For each package:
> - credits and price;
> - "N enquiries at ฿X each";
> - one full-width Pay button per method, with unchanged disabling;
> - "Online payment opens soon. You won't be charged." when payments are off, or "Available after approval." when not approved;
> - the existing charging note;
> - `taxLabel`, unless it is the bracketed placeholder.
>
> **QR card.** When a QR exists, it replaces the package card: Scan to pay, the provider QR with the existing alt text, the amount, the existing sentence, and Check status (`reconcile-order`).
>
> **Statement.** One signed amount per row (rules in §6.5). Order rows show a status pill, method and amount, plus Check status only for non-final orders. Delete the four-delta line.
>
> **Acceptance.** Match `credits-en-*`, `credits-payment-en-*` and `credits-debt-th-*`. The balance arithmetic is unchanged.

## Prompt 5: company, setup checklist, claims and terms

> Implement SIGNAL_SPEC §5, §7 and §8 in `components/installers/company.tsx`, `portal.tsx` (claims and terms views) and `workspace.tsx` (checklist).
>
> **Company page.**
> - Remove the accepting card and the shared-residential note.
> - Service areas: an even tile grid (2 columns, then 3 from 640 px) with check icons and "{n} selected". Extras show as × tiles. Keep the existing add-area disclosure.
> - Per-day stepper from 0 to 100, with the zero-only hint.
> - Short LINE alerts card: Connect, or Connected + Disconnect with an inline confirm that uses the existing warning.
> - Company details.
> - One `update-company` save, through a save bar that appears when something changed: fixed above the tab bar on phones, a sticky pill on desktop.
> - Create mode: title "Set up your company", an inline Create company button, and `create-company` with `paused: true`.
> - Links card: Credit claims (count) and Installer terms (Accepted date, or an "Action needed" pill).
>
> **Checklist.** For companies that are missing or not approved, replace the inbox content with the setup or review checklist card from §5, with the done rules and actions in its table.
>
> **Claims and terms.** Each page gets "← Company", an H1, and the existing content in one card. Terms is the only page that shows the portal disclaimer and the Bangkok-time line.
>
> **Acceptance.** Match `company-en-*`, `company-nocompany-th-*`, `inbox-pending-en-*`, `inbox-nocompany-th-*`, `claims-en-*` and `terms-terms-th-*`. Saving stays disabled when the email isn't verified or there are no areas.

## Prompt 6: full QA pass

> Run SIGNAL_SPEC §10 end to end.
>
> **Screens and states.**
> - Capture every view at 360, 390, 768 and 1440 px, in English and Thai.
> - Use seeded local data for each state: approved, empty, paused, platform-paused, unverified, terms not accepted, no credits, debt, payment QR, pending, no company and withdrawn.
> - Check there is no horizontal scroll.
> - Compare against `reference/` and fix differences.
>
> **Accessibility.** Run axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa and best-practice) on each state and get it to zero.
>
> **Tests.** Update `installer-workflow.spec.ts` and `installer-studio.spec.ts` for the removed Today view and the new selectors. Then run the full test and lint suite.
>
> **Report.** List anything you couldn't match, and any copy that needs native Thai review.
