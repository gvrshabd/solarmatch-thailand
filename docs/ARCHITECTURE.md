# Architecture note

The canonical architecture and decision boundary is maintained at [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## Fixed in this calculator release

- Thai-first and English-parity question flow.
- Browser-session-only address and estimator state.
- Manual Leaflet/OpenStreetMap location confirmation with no geocoder.
- Versioned progressive residential tariffs and province solar-yield anchors.
- Self-consumption-first sizing that does not enlarge a system to compensate for shade.
- One public planning value, evidence confidence, and tightly gated “up to” wording.
- Cash planning prices, routine upkeep, degradation, and a year-13 inverter reserve.
- Conditional export and tax information excluded from headline economics.
- No lead, database, routing, OTP, payments, ads, analytics provider, or automation integration.

## Intentionally deferred

- Exact-address geocoding, autocomplete, satellite imagery, roof polygons, LiDAR, and site-specific irradiance.
- Engineering design, structural assessment, quote guarantee, and installer-specific equipment.
- Validated TOU and privately billed financial models.
- Buyer qualification, pricing, exclusivity, routing, live forms, LINE, CRM, and analytics.
- Automated source updates and production legal/PDPA approval.

See `CALCULATOR_METHOD.md`, `CALCULATOR_SOURCES.md`, `ADDRESS_MAP_PRIVACY.md`, and `UX_RESEARCH.md` for the current model boundary.
