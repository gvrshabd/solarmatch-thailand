# Calculator and website UX research

Last reviewed: **2026-08-28**

## Design principles applied

### One meaningful question at a time

The quick estimate follows the [GOV.UK question-page pattern](https://design-system.service.gov.uk/patterns/question-pages/): one primary decision per step, a short explanation of why it matters, clear back/next actions, and no artificial time estimate. This reduces scanning load on mobile and makes errors easier to understand.

### Ask directly; keep “I do not know” available

The estimator asks for observable roof material and shade instead of first asking whether the visitor knows roof details. “I do not know” or “Not sure” is the final option when uncertainty is legitimate. The model then lowers confidence or suppresses a claim rather than pressuring the visitor to guess.

### Prefer evidence the homeowner can actually find

kWh is offered first with a plain-language cue for finding it on a bill. Bill amount remains a fallback and is inverted through the progressive tariff. Daytime behavior is asked through recognizable situations and appliance groups, not technical load-profile percentages.

### Progressive disclosure

The quick path contains the inputs with the largest practical effect. More demanding details—direction, slope, phase, roof area, future loads, and quotation details—appear after the first result in an accuracy-upgrade section. Changing one recalculates the result immediately and explains what changed.

### One planning figure, uncertainty beside it

Large wide ranges can feel noncommittal without helping a homeowner decide. The result therefore leads with one rounded planning figure and evidence confidence. A restrained “up to” ceiling is used only when eligibility rules are met, never exceeds 20% above planning, and uses the same system and exclusions. Sensitivity information remains secondary.

This is not false precision: the page states what was assumed, withholds unsupported financial results, names the best next evidence, and never disguises a planning value as a quotation or guarantee.

### Ethical persuasion

The site uses no fabricated testimonials, partner logos, popularity claims, countdown timers, false scarcity, preselected consent, or contact gate before results. Clear caveats sit with the figures they qualify. Future loads do not inflate today’s promised savings. Conditional export and tax information remain outside the headline.

### Mobile and accessible interaction

The implementation follows relevant [WCAG 2.2 guidance](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/): keyboard-visible focus, alternatives to drag interactions, comfortably sized targets, non-hover access, associated validation, and content that reflows at narrow widths. The map marker can be moved by tap, drag, or labelled buttons, so dragging is not the only interaction.

## Journey used in this release

1. Exact address text and manual map confirmation.
2. kWh/bill choice with contextual help and optional extra months.
3. Period represented by the number.
4. Tariff branch, with financial withholding for unvalidated TOU/private paths.
5. Daytime occupancy/use pattern.
6. Daytime loads, with small conditional follow-ups.
7. Direct roof-material question; “I do not know” last.
8. Direct observable-shade question; “Not sure” last.
9. One planning result, confidence explanation, assumptions, and optional accuracy upgrades.

## Known limitations and next research

- Run Thai moderated usability sessions on finding kWh, locating tariff clues, using the map, and interpreting “up to”.
- Test comprehension of planning price versus quotation and self-use value versus conditional surplus.
- Validate mobile behavior on physical iOS and Android devices; this release can be emulation-tested where physical devices are unavailable.
- Compare calculator predictions with anonymised real bills, interval data, PVGIS roof runs, installer designs, and completed-system output.
- Interview installers on price inclusions, phase constraints, roof material, structural work, and the point at which a remote estimate should stop.
- Do not add address autocomplete, lead collection, or behavioral analytics until their privacy and consent models are approved.
