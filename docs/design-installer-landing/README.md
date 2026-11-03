# SolarMatch installer landing page: Sonnet handoff

This handoff covers the new signed-out installer page at `/installers`: the **"Pulse light"** layout with the **Glow** hero. It replaces only the landing page. The Signal portal already on main doesn't change.

## What's in here

| File | What it is |
|---|---|
| `SONNET_PROMPTS.md` | Two prompts to paste into Claude Code with Sonnet: one builds the page, one runs the tests and checks |
| `LANDING_SPEC.md` | The full spec, mapped to the real files (`landing.tsx`, `signal-landing-copy.ts`, `installers-signal.css`, the unit test) |
| `prototype/` | The final design on its own. Open `index.html` in a browser; it has a ไทย / EN toggle and both animations |
| `reference/` | Screenshots in EN and TH at phone, iPad (1180 × 820) and desktop width, plus the How it works path midway and at the end |

## How to use it

1. Copy this folder into the repo as `docs/design-installer-landing/` and commit it on a new branch.
2. Open Claude Code in the repo, choose Sonnet, and paste **Prompt 1** from `SONNET_PROMPTS.md`.
3. Look at the result on your phone and iPad, then paste **Prompt 2**.

## What changes compared with the current page

- **Headline:** "Get connected with homeowners **who asked to be called.**", with the second half in green. The eyebrow is now just "Bangkok & nearby", and the lede is gone.
- **Buttons:** "Apply as a solar installer" and "Sign in". The rules for when they're disabled are unchanged ("Applications unavailable" still appears when sign-ups are off).
- **Hero:** a soft, slowly moving glow fills it and fades into How it works with no hard edge. On iPad and desktop it fills the first screen.
- **Examples:** the single Arun card becomes a dark **EXAMPLES** panel of six fictional customers.
  - On iPad and desktop it scrolls on its own, upwards.
  - On phones it scrolls sideways and is slimmer, with thinner cards.
  - Touching it, or tapping the pause button, stops it.
- **How it works:** the steps are now Apply → Receive customer information ("Through LINE or email") → Call and earn!
  - On iPad and desktop they sit on an arc. A sun travels along it as you scroll, and each circle turns gold when the sun reaches it.
  - On phones the sun moves down a vertical line instead.
  - The circles sit exactly on the arc; the spec has a check for this.
- **Questions:** a full-width roof photo with a slow zoom, then four questions. They cover the cost per enquiry, how many companies get the same homeowner, the free trial, and wrong details. The numbers come from the live settings.
- **Removed:** the pricing strip, the Pricing link, "Can I pause?", "Is a sale guaranteed?", and the old claim sentences on this page. Those legal lines still appear in the installer terms and in the portal's claim form.

The Thai text is a draft and should be checked by a native speaker. All example customers are fictional.
