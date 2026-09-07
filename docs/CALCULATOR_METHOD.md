# Calculator method

Model version: `thailand-residential-ballpark-2026-09-01-v6`
Last reviewed: 2026-09-01

The model is a bill-led lead-qualification ballpark. It must produce a complete consumer result after the required flow, but it must not imitate an engineering design or quotation.

## Required inputs

The ten required answers are:

1. Province.
2. Typical monthly electricity bill in baht.
3. Property type.
4. Ownership or residential occupancy arrangement.
5. Approximate usable roof-area band.
6. General daytime electricity intensity.
7. Regular daytime residential loads and installed AC count when air conditioning is selected.
8. Roof material.
9. Observable shade.
10. Approximate installation timeframe.

The homepage and estimator use the same bill field and session state. When province and bill come from the homepage, the estimator begins at the first unanswered question. There is no kWh, multi-month, period, TOU, or weather question in the consumer flow.

## No-invented-number rule

Each displayed metric must be traceable to one of:

- a direct user answer;
- a current official tariff or policy source;
- current observed Thai package-price evidence; or
- a documented conservative research fallback.

If a metric cannot be supported, the remedy is an easier input or a clearly documented fallback—not a fake default. The result includes a programmatic `trace` list so its bill, tariff, derived usage, system size, production, price, and lifetime reserve can be audited.

## Bill-to-consumption conversion

Every public route and calculation uses the current effective PEA/MEA residential schedule. Commercial tariff classes and demand-charge assumptions are outside this release.

`bill(kWh) = (service charge + tiered energy charge + kWh × Ft) × (1 + VAT)`

The inverse is solved exactly through the same piecewise tariff tiers, Ft, service charge, and VAT. There is no ฿50,000 or kWh business-rule cap. The slider expands to the entered amount, while direct keyboard entry remains available.

## Starting system size

Thai load-profile research supports a bounded annual-load matching range for residential loads. The general daytime-use answer selects a point within that evidence envelope:

| Daytime intensity | Annual-load share |
| --- | ---: |
| Very low | 24% |
| Low | 28% |
| Moderate | 32% |
| High | 40% |
| Very high | 48% |

Directly reported residential daytime loads can make a small bounded adjustment, still capped inside the documented planning envelope.

`bill-led kWp = annual estimated kWh × target share ÷ province yield`

The result rounds to 0.5 kWp and uses a 1.5 kWp minimum where no comparable quotation is supplied. Because the current public package evidence starts at 3 kWp, systems below 3 kWp use the 3 kWp package-price floor instead of inventing a cheaper small-system price. Shade and orientation reduce expected production; they do not inflate the recommended sale.

## Roof constraint

Current 550 W module datasheets imply approximately 4.0–4.75 m²/kWp before access and layout spacing. The planning model uses a conservative 5.5 m²/kWp. Closed roof-area bands use a representative area divided by 5.5. “More than 200 m²” is intentionally open-ended and therefore does not invent an upper capacity cap. “Unsure” leaves the result bill-led and marks roof feasibility unconfirmed.

An optional exact roof area replaces the band and constrains system size directly.

## Production and self-use

`first-year production = kWp × province yield × direction/slope factor × shade factor`

Province yields are stored PVGIS-derived long-run planning anchors. The model uses monthly production shares and never assumes permanently clear weather. Self-consumption begins with the user-selected daytime intensity, receives a small bounded adjustment for directly reported high-use equipment, and is reduced when production grows large relative to load.

Monthly self-use can never exceed monthly consumption or modeled production.

## Savings

`annual avoided bill = Σ[bill(monthly load) − bill(monthly load − monthly self-use)]`

The headline result excludes export income, tax relief, finance, and electricity-price escalation. The displayed monthly reduction is rounded down to ฿50; annual savings are rounded down to ฿100.

## Price and payback

Planning-price anchors triangulate current GRoof and PEA Shopping packages:

| Size | Single phase | Three phase |
| --- | ---: | ---: |
| 3 kWp | ฿130,000 | ฿145,000 |
| 5 kWp | ฿175,000 | ฿195,000 |
| 10 kWp | ฿290,000 | ฿300,000 |
| 15 kWp | ฿454,900 | ฿454,900 |
| 20 kWp | ฿550,000 | ฿550,000 |

Values between anchors are interpolated. Larger systems extend the evidenced 15–20 kWp marginal price rather than freezing at the 20 kWp price. A user-supplied comparable battery-free cash quote may replace the market price.

NREL's 2024 residential PV benchmark models fixed O&M at 1.02% of CAPEX and includes cleaning, component failure, and inverter-related work. SolarMatch uses that percentage once as an annual maintenance/component reserve; it does not double-count a separate invented inverter event.

`simple payback = planning price ÷ (first-year avoided bill − annual reserve)`

The required ten answers always produce an explicit payback outcome. When first-year avoided-bill value is greater than the annual reserve, the model displays the calculated simple payback. When it is not, the truthful result is “Not reached” / “ยังไม่คืนทุน”—never a manufactured denominator and never “Needs more information.”

## 25-year net value

For each year, avoided-bill value is reduced by 0.5% annual module degradation. Electricity-price escalation remains 0%.

`25-year net value = cumulative avoided bills − installation price − cumulative annual reserve`

The public “Save up to” value is the rounded-down conservative net value itself; it is not an inflated confidence multiplier. When net value is non-positive, the UI leads with monthly bill reduction instead of claiming savings that the model does not support.

## Optional precision inputs

Exact address/map, exact roof area, direction, slope, phase, future loads, and a comparable cash quotation are optional. Each applicable input immediately recalculates the same result and updates a visible status message. Address and coordinates remain in browser session storage and are not submitted.

Material constants live in `config/solar-assumptions.ts` and `config/electricity-tariffs.ts`. Calculation code lives in `lib/calculator/residential-estimator.ts`. Lead qualification is separate and lives in `lib/qualification/scoring.ts`. Material changes require a source review, model-version update, and regression test.

The 3–5 second result-preparation state and its published loading fact are presentation-only. Fact selection, contact-mode choice, and the presence or absence of a contact submission never alter calculation inputs or outputs.
