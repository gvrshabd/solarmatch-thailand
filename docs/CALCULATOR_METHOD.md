# Calculator method

Model version: `prototype-2026-08-28-th-planning-v3`

Last reviewed: 2026-08-28

This document describes the current planning model exactly. It is an educational pre-quotation screen, not a site design, engineering assessment, quotation, financing offer, or savings guarantee.

## Inputs and sequence

The quick path asks one main question at a time:

1. Typed home address and user-confirmed map position.
2. Monthly electricity use in kWh, or bill amount when kWh is unavailable.
3. Whether the number is a 12-month average, 3-month average, latest month, typical month, or unknown.
4. Standard residential, TOU, privately billed, or unknown tariff.
5. Observable weekday daytime-use pattern.
6. Regular daytime loads, with conditional air-conditioning and EV follow-ups.
7. Roof material, including a final “I do not know” option.
8. Observable shade from roughly 10:00–15:00.

The results page can then accept roof direction, slope, usable area, electricity phase, expected future loads, and a comparable solar-only cash quotation. Future loads are disclosed separately and do not inflate present savings.

## Electricity consumption

When kWh is supplied, it is used directly. When only a bill total is supplied, the calculator solves for the kWh that reproduces that bill under the versioned progressive tariff:

`bill(kWh) = (service charge + tiered energy charge + kWh × Ft) × (1 + VAT)`

The inverse is found by bounded binary search. This is more faithful than dividing the bill by one flat rate. TOU and privately billed customers do not receive financial results until those models are validated.

If extra months are supplied, valid positive figures are averaged. The current prototype uses that average across the year, while preserving supplied monthly figures as the most recent months. It does not invent weather-normalised interval data.

## System sizing

The daytime answers create a low, medium, high, or unknown load profile. The target annual-load shares are currently 34%, 52%, 68%, and 44% respectively.

`starting kWp = round to 0.5 kWp((annual household kWh × target share) / province yield)`

The result is constrained to 1.5–10 kWp unless the user enters a real quotation size. Direction and shade reduce expected production; they never silently increase the recommended system to compensate. This prevents the model from turning a poor roof into a larger sale.

## Production

Province reference yields are annual kWh per installed kWp: Bangkok 1,380; Nonthaburi 1,376; Pathum Thani 1,357; Samut Prakan 1,398; fallback 1,375. They are transitional PVGIS-derived planning anchors, not a roof-specific PVGIS simulation.

`first-year production = kWp × province yield × orientation/slope factor × shade factor`

Orientation/slope factors range from 1.00 for the south group to 0.86 for a steep north-facing roof. Shade factors are 1.00 for little/no shade, 0.96 for short shade, 0.85 for several hours, 0.75 for heavy shade, and 0.95 when unknown. Heavy or unknown shade suppresses any “up to” statement.

Production is distributed over 12 versioned monthly shares. Self-consumption starts from the daytime-load archetype and is adjusted down when PV is large relative to household demand. Monthly direct use cannot exceed that month’s household consumption or modeled solar production.

## Savings and tariff treatment

Directly used solar is valued using the exact difference between the progressive residential bill before and after monthly self-consumption:

`avoided bill = Σ[bill(monthly load) − bill(monthly load − direct solar use)]`

The main planning figure excludes export revenue, tax treatment, financing, and electricity-price escalation. The tariff-escalation assumption is 0%.

Surplus is displayed separately. The prototype mentions the conditional ฿2.20/kWh programme, 10-year term, 5 kW AC export limit, quota, eligibility, and utility approval, but it does not add that revenue to headline savings or payback.

## Price, upkeep, and payback

Cash-price anchors are interpolated and rounded to ฿5,000:

| Size | Single phase | Three phase |
| --- | ---: | ---: |
| 1.5 kWp | ฿99,000 | ฿109,000 |
| 3 kWp | ฿115,000 | ฿130,000 |
| 5 kWp | ฿155,000 | ฿175,000 |
| 10 kWp | ฿250,000 | ฿260,000 |

Unknown phase uses the single-phase planning anchor but lowers evidence confidence. A complete solar-only cash quotation can replace the market anchor. A quote marked as battery-inclusive is never treated as comparable.

Routine upkeep is ฿3,000/year up to 3 kWp, ฿4,000/year up to 5 kWp, and ฿5,000/year above 5 kWp. The long-term view applies 0.5% annual panel degradation and one year-13 inverter reserve equal to 23% of planning cost, rounded to ฿1,000 and constrained to ฿25,000–฿60,000.

`simple cash payback = planning cash price / (first-year avoided bill − annual routine upkeep)`

Payback is withheld when the financial model is unavailable, annual net value is non-positive, or evidence confidence is low.

## One planning figure and restrained “up to” language

The interface does not present a broad low-to-high range as its main answer. It shows one rounded planning system, price, production, monthly saving, and—when supported—payback. The legacy range fields remain internally for compatibility and sensitivity tests, not as dominant public claims.

An “up to” monthly saving is permitted only when:

- the tariff is identified as standard residential;
- confidence is medium or high;
- shade is neither heavy nor unknown; and
- roof material is known.

The ceiling uses the same home, same system, and same exclusions as the planning figure. It is 8% above planning at high confidence or 15% at medium confidence, rounded down to ฿50 and hard-capped at 20% above planning.

## Evidence confidence

Confidence rewards actual kWh, multi-month averages, identified tariff, observable daytime use and shade, known direction/slope and phase, and a comparable quotation. It penalises bill-derived load, unknowns, heavy shade, TOU/private billing, extreme inputs, and very small systems without a quotation.

High confidence additionally requires actual kWh from a 3- or 12-month average, standard tariff, known shade, and known direction and slope. Confidence affects claim eligibility and which follow-up checks are recommended; it never exists merely because the user completed more screens.

## Rounding and boundaries

- System sizing: nearest 0.5 kWp; quotation size nearest 0.1 kWp.
- Planning cash price: nearest ฿5,000.
- Monthly savings: nearest ฿50.
- Annual savings: nearest ฿100.
- Production and energy flows: nearest 100 kWh in the public result.
- Payback: nearest 0.1 year.
- 10- and 25-year difference: nearest ฿1,000.

All configuration lives in `config/solar-assumptions.ts` and `config/electricity-tariffs.ts`; calculation code lives in `lib/calculator/prototype-estimator.ts`. Any change to a material constant requires a source review, model-version change, and regression tests.
