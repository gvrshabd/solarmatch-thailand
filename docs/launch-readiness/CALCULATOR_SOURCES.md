# Calculator evidence review — 3 November 2026

No model constants or arithmetic were changed. The PEA display labels were corrected to its official ordinary category numbering (1.1.1 / 1.1.2); internal enum values and stored answers remain compatible. MEA keeps separate labels and the unresolved primary-source check below.

| Factor | Primary evidence / current check | Result and next review |
|---|---|---|
| PEA base tiers/service | https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf — residential page 2 | 200 kWh at 3.0000, next 200 at 4.1584, above400 at 4.3583; ordinary larger-meter service24.62. Matches current engine. Small-meter service8.19 and first15/next10 tiers retained. Official categories1.1.1/1.1.2, distinct from TOU1.2. |
| Ft | https://www.pea.co.th/our-services/tariff/ft — current page | September–December2569:0.1623THB/kWh. Current configuration expires2026-12-31. Review before next period and on an official announcement. |
| PEA announcement | https://www.pea.co.th/news/corporate-news/2392 | September2026 effective announcement still available; numerical tiers checked against PDF rather than relying on image-only article. |
| MEA | https://www.mea.or.th/our-services/service-rates/other/D5xEaEwgU | Fetch timed out; alternate tariff page rejected request. Independent MEA tier/source verification remains incomplete. Do not claim it was verified from PEA evidence. |
| Installed price | CX ENERTECH package pages in config/solar-packages.ts | All four starting references rechecked:105000 /159000 /153000 /256000THB. The5.005kWp page shows7×715Wp, battery excluded. These are not competitive quotations or a market average. VAT remains unstated;7% contingency is explicitly not confirmed VAT. Obtain dated site quotations before treating reference as installed price. |
| Generation | https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en and versioned config/solar-resource-v3.ts | Existing long-run resource retained. Direct PVGIS API request unavailable through research tool this run; no new resource calibration claimed. |
| Self-consumption | Existing versioned hourly/load model and tests | No measured household validation newly supplied. Smooth profiles and uncertain appliance coincidence can overstate self-use; retained limitation. Installed appliances do not imply all run simultaneously. |
| Operating reserve/degradation | Existing NREL/IRENA evidence in config/solar-assumptions.ts | Planning assumptions remain1.02% annual price reserve and0.5% module degradation; not a servicing quote or warranty. NREL source fetch returned502 this run; no fresh confirmation of that input is claimed. |
| Export/tax/finance | Separate optional scenarios, tested by calculator scenario/benefit suites | No export, tax relief or finance benefit enters the base scenario. Contract/program/tax eligibility is independent and not guaranteed. No new program/rate claimed here. |

Update procedure: record URL, source publication/effective dates, exact category/area, units, VAT/scope and expiry; compare against current version; obtain missing primary evidence; change a versioned assumption only with regression examples explaining deltas; rerun bill↔kWh/tariff/benefit tests and screenshots. Keep saved input/reference provenance and unsupported-date behavior. Do not silently relabel a MEA calculation as PEA or extend an expired period.

No recurring automation was created. No claim of engineering validation, native-speaker approval or legal approval is made.

