# Calculator review — 21 September 2026

## Scope and conclusion

Read-only research and model review accompanying local contact/Terms/About preparation. No calculator constants, production configuration, database records or deployment were changed. The current model remains a planning estimate, not a site-specific engineering or financial forecast.

The standard residential tariff assumptions are consistent with the September 2026 published structure. Installation-price assumptions deserve a fresh like-for-like quotation comparison; cheaper advertised packages exist, but that alone does not establish a national price trend.

## Evidence checked

| Input | Current model | Review |
| --- | --- | --- |
| Residential energy tiers, September–December 2026 | First 200 kWh: ฿3.0000; next 200: ฿4.1584; remaining: ฿4.3583 | Matches PEA type 1.1.2 published tariff. This is not a universal tariff for small-meter or time-of-use customers. |
| Ft | ฿0.1623/kWh | Matches ERC September–December announcement. Do not substitute the average all-in national electricity price for an individual marginal tariff. |
| Authority | MEA: Bangkok, Nonthaburi, Samut Prakan; PEA elsewhere | Appropriate default service-area mapping; special supply arrangements require individual verification. |
| Export income | ฿2.20/kWh informational assumption; excluded from core savings | MEA's residential programme describes ฿2.20/kWh for ten years, subject to programme eligibility and approval. Electricity is sold to the utility, not an installer. No approval, quota or income is guaranteed. |
| Installation price | 5 kW: ฿175,000 single-phase / ฿195,000 three-phase; 10 kW: ฿290,000 / ฿300,000 | Smart Greentech advertises residential 5 kWp packages at ฿143,000 / ฿146,000 and 10 kWp at ฿217,000 / ฿239,000, promotion ending 30 September 2026. VAT, roof work, equipment, AC/DC capacity, warranties and included work must be compared before recalibration. |
| Generation | Province anchors approximately 1,357–1,398 kWh/kWp/year, adjusted for roof/shade | No fresh site-specific PVGIS simulation performed. Actual orientation, shading and daytime demand can materially differ. |
| Degradation and reserve | 0.5% annual degradation; annual reserve 1.02% of planning price | Planning assumptions, not current Thai maintenance quotations or guarantees. No new calibration performed. |

Primary sources:

- [PEA September 2026 tariff PDF](https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf)
- [PEA September residential tariff announcement](https://www.pea.co.th/news/corporate-news/2412)
- [ERC September–December Ft announcement](https://erc.or.th/th/news-release/3458)
- [Thai government residential tariff announcement](https://www.thaigov.go.th/th/news/168276)
- [MEA residential export programme and dated notices](https://myenergy.mea.or.th/)
- [Smart Greentech residential packages](https://www.smartgreentech.co.th/แพ็คเกจ-solar-rooftop/)
- [GRoof May 2026 brochure](https://groof-public.s3.ap-southeast-1.amazonaws.com/pdfs/GRoofPackage_Brochure_May2026.pdf): additional package evidence, not a newly issued September quotation.

## Calculation review and limitations

The estimator reverses the bill through the selected tariff, estimates generation and self-consumption, then calculates avoided bills through the same tariff. Its shared result feeds cards and cumulative costs. The 25-year path applies degradation and annual reserves; export income, tax relief, finance and tariff escalation remain excluded. Simple payback uses first-year net savings, not a claim to model degraded cashflows exactly.

Important follow-up items:

1. The last configured tariff period ends 31 December 2026. The resolver falls back to the latest tariff after expiry. Review before January 2027; do not mistake fallback for freshly verified pricing.
2. MEA's configured source URL returned a request-rejected response during this review. Government reporting corroborates the shared revised tiers, but direct MEA source accessibility still needs checking.
3. PEA shopping package pages and the NREL reference could not be freshly verified. Do not update their verification dates based on this review.
4. Tax programme eligibility and deadlines were not freshly validated. They remain outside base savings.
5. Time-of-use and small-meter tariff categories, hourly demand, roof engineering and battery/upgrade economics are not fully modelled. Do not market the output as universally accurate.
6. Optional quoted installation prices are rounded by the existing model; precision and any recalibration require a separate deliberate model change with regression cases.

## Reusable monitoring brief — not scheduled

Check weekly for material changes to SolarMatch Thailand calculator inputs using primary sources. Compare against `config/electricity-tariffs.ts`, `config/solar-assumptions.ts` and this review. Watch ERC Ft periods; PEA/MEA residential tiers, service charges and export programme rates/eligibility/quotas; Revenue Department tax rules; comparable residential installation packages; and material solar-resource/equipment evidence. Distinguish announcement dates from effective dates and proposals from enacted rules. Compare VAT, phase, kWp/kW, inverter, warranty, installation scope and promotion expiry before calling a package cheaper. Report the previous and new value, primary URL, effective period, affected model field and likely impact. Warn before configured periods expire. Say when no verified material change was found. Never automatically edit constants, deploy, change production data, or target Milly's. Export-rate changes do not alter core savings while export income remains excluded.

No recurring automation has been created. The owner can request a schedule separately.
