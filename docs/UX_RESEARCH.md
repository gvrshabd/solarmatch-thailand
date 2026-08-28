# Lead journey and calculator UX rationale

Last reviewed: **2026-08-28**

## Principles applied

### A lead-generation journey with a useful result first

SolarMatch is positioned as a lead-generation and qualification business, not as a calculator company. The estimate earns trust and helps a visitor become an informed, better-qualified enquiry. Results appear before the contact form, and the unfinished matching service validates then discards contact details instead of pretending a live handoff exists.

### One meaningful question at a time

The required estimate follows the [GOV.UK question-page pattern](https://design-system.service.gov.uk/patterns/question-pages/): one primary decision per step, a short reason, clear back/next actions, and no artificial completion-time claim. This reduces scanning load on mobile and makes errors easier to understand.

### Ask directly; make uncertainty respectful

The estimator asks for observable roof material and shade directly. **Unsure** is the final option wherever uncertainty is legitimate. Visitors are never first asked whether they know technical roof details and are not pressured to guess.

### Make the easiest evidence the default

The consumer flow asks only for a typical monthly electricity bill—not kWh, a billing period, TOU details, multiple months, or weather. The amount can be typed or adjusted with a smooth slider, can be emptied normally, and has no visible ฿50,000 business cap. The same field appears on the homepage and is not asked twice after handoff.

### Eight required answers must be enough

The required journey is:

1. Province.
2. Typical monthly electricity bill.
3. Property type.
4. Approximate usable roof area.
5. General daytime electricity intensity.
6. Regular daytime loads, including other unlisted high-use equipment.
7. Main roof material, with **Unsure** last.
8. General shade level, with **Unsure** last.

Those eight answers always produce a starting system size, first-year production, installation-price figure, monthly bill reduction, simple cash payback, and conservative 25-year net value. Optional details refine an already complete result; they never unlock a metric that the required journey claimed it could provide.

### Progressive disclosure

More demanding details—exact map position, usable roof area, direction, slope, electrical phase, future loads, and a real quotation—appear after the first result. Each supported change recalculates the figures immediately and provides a visible status message. Exact-address text remains optional and is not geocoded.

### One decision-ready figure, not a credibility-damaging range

The result leads with rounded planning values rather than a very wide headline range. “Save up to” is the model’s conservative, rounded-down 25-year net result for the same system and exclusions; it is not an arbitrary uplift. Export income, tax relief, finance, and electricity-price escalation remain outside that headline.

This is not a quotation or guarantee. The page keeps assumptions beside the metrics, links to the method and sources, and explains that an installer must survey and design the final system.

### Ethical persuasion

The site uses clear benefits and positive next-step language without fabricated testimonials, partner logos, popularity claims, countdown timers, false scarcity, preselected consent, or a contact gate before results. Conditional export and tax information is framed as possible eligibility, while remaining outside the base calculation.

### Mobile and accessible interaction

The implementation applies relevant [WCAG 2.2 guidance](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/): visible keyboard focus, alternatives to drag interactions, comfortably sized targets, non-hover access, associated validation, and reflow at narrow widths. The optional map marker can be moved by tap, drag, or labelled buttons.

## Known limitations and next validation

- Compare predictions with anonymised real bills, interval data, PVGIS roof runs, installer designs, quotations, and completed-system output.
- Interview installers about price inclusions, phase constraints, roof material, structural work, service areas, and the qualification signals that make a lead valuable.
- Run moderated Thai mobile sessions on the bill slider, answer wording, result comprehension, and the transition into the matching request.
- Validate on physical iOS and Android devices; current automated coverage uses credible emulation where real devices are unavailable.
- Do not activate lead collection, installer routing, address lookup, analytics, or advertising until the data, consent, and operating models are approved.
