# SolarMatch for installers: Signal handoff

This handoff is for **concept A, Signal**, which you chose for the installer website and portal. It contains a design spec, prompts for ChatGPT, a clickable prototype and reference screenshots.

| File | What it is |
|---|---|
| `SIGNAL_SPEC.md` | The full spec, mapped to the real files in `components/installers/`. It lists what changes, what stays word for word, and the acceptance checks. |
| `CODEX_PROMPTS_SIGNAL.md` | Six prompts to paste into ChatGPT in order, with a shared preamble. |
| `prototype/` | Open `index.html` in a browser. The dark bar switches between Website and Portal and between 11 account states. Every string is in both English and Thai. |
| `reference/` | 52 screenshots, named `{route}-{state}-{lang}-{phone or desktop}.png`. They do not include the prototype bar. |

## How to use it

1. Copy this folder into the repo as `docs/design-signal/`.
2. Paste the prompts into ChatGPT one at a time, starting each with the preamble.
3. After each prompt, compare the result with `prototype/` and `reference/` before moving on.

## Decisions made for you

- **The Today view is gone.** The inbox, sorted by who has waited longest, does its job. `?view=overview` now opens the inbox.
- **One notice at a time.** The portal shows only the most important notice (unverified email, then terms, platform pause, debt, out of credits). The next one appears once that one is resolved.
- **Notes save on blur.** There is no Save button. The existing revision conflict check still applies.
- **No homeowner LINE contact yet.** The concept showed a "message on LINE" button. The portal data doesn't include a homeowner's LINE preference today, so the button is left out until a privacy-reviewed change adds it. LINE alerts for installers are unchanged.
- **Thai copy is a draft.** It reuses the repo's existing Thai wherever a string already existed. New lines need a native review.
- **Legal and privacy wording stays word for word.** This covers share links, withdrawal, debt, claims, LINE disconnect, the auth note and terms (spec §9.2).

Prototype data is fictional.
