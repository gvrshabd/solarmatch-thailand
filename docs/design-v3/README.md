# SolarMatch Design v3 handoff

- `V3_SPEC.md`: what changes and why, page by page, with exact copy, phone vs desktop rules and acceptance checks.
- `CODEX_PROMPTS_V3.md`: six prompts for ChatGPT/Codex, in order, with a shared preamble.
- `prototype/`: clickable v3 reference (open `index.html`). Estimates use SolarMatch's real calculator; installer data is fictional.
- `reference/`: before/after screenshots (main vs v3) for the main screens.

Copy this folder into the repo as `docs/design-v3/` before running the prompts. v2 (`docs/design-v2/`) stays as the record of what is on `main` now.

Decisions for the owner:
1. Question order: bill first needs questionnaire version 10 (preferred). The fallback keeps v9 with a pre-filled bill step.
2. Footer legal text: one visible line plus a disclosure. Ask legal review whether the operator line must stay visible.
3. Tax and surplus extras: opt-in and shown separately; the base result is unchanged. Confirm the tax wording with an adviser before launch.

Thai copy is a draft for native review.
