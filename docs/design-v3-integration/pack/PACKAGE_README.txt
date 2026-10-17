SolarMatch homeowner Design v3 + calculator implementation handoff
Prepared 17 October 2026, Bangkok time.

Give this ZIP to your executor, then instruct it to read EXECUTOR_PROMPT.txt as your task and carry it out.

FINAL OWNER SCOPE: Apply Claude v3 visual design to HOMEOWNER pages and calculator only (prompts 1–4). Keep the existing For Installers landing and installer portal design unchanged. Installer controls/functionality may be improved where relevant, through the existing UI. Do not implement installer visual redesign prompts 5–6.

EXECUTOR_PROMPT.txt is the single integrated task. Its explicit scope and accuracy overrides take precedence over the original design instructions and obsolete calculator arithmetic.

design-v3/ contains all 26 original Claude files, unchanged byte-for-byte. It includes installer mockups for reference only: these are explicitly outside the visual implementation scope. The complete final prototype CSS, including v3.1 and v3.2, is the homeowner visual source of truth. Reference PNGs may contain NOW/V3 comparisons or earlier states.

CALCULATOR_AUDIT.txt contains prior read-only findings and sources. It is evidence; inspect the current repository and verify current assumptions. It is not an instruction to restore an old commit.

PACKAGE_MANIFEST.json lists byte lengths and SHA-256 hashes for every file except itself, plus the original upload hash.

No application code was changed, deployed or merged while preparing this handoff. No secrets or live customer records are included. Prototype sample data remains fictional. Keep previews protected. Do not enable real operations or deploy to production.
