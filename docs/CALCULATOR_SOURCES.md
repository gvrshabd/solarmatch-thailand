# Calculator source register

Last checked: **2026-08-28**

This register separates primary evidence from transitional assumptions. A link is not an endorsement of SolarMatch or any supplier.

## Primary policy and utility sources

| Subject | Source | Use in the model |
| --- | --- | --- |
| Residential tariffs | [PEA electricity-tariff register](https://www.pea.co.th/our-services/tariff) | Version control for residential tier schedules, service charge, and effective dates |
| Fuel adjustment charge | [PEA Ft register](https://www.pea.co.th/our-services/tariff/ft) and [ERC automatic Ft](https://www.erc.or.th/th/automatic) | Ft period and amount; current model uses ฿0.1623/kWh for the documented 2026 periods |
| May 2023 tariff schedule | [PEA tariff PDF](https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf) | Progressive residential tiers used through August 2026 |
| September 2026 tariff schedule | [PEA tariff PDF](https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf) | Progressive residential tiers selected automatically from 1 September 2026 |
| PEA surplus purchase | [PEA PPIM programme](https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766) | Conditional ฿2.20/kWh, term, eligibility and PEA process; excluded from the base result |
| MEA surplus purchase | [MEA My Energy programme](https://myenergy.mea.or.th/project/6a38ac8d329d02001dd7024e) | MEA-area application and export-control conditions; excluded from the base result |
| Regulatory notice | [Energy Regulatory Commission notice (PDF)](https://erc.or.th/web-upload/200xf869baf82be74c18cc110e974eea8d5c/202606/m_news/9090/3441/file_download/ae5c0f3369d23b692064262036b1725f.pdf) | Programme framework, quota, 5 kW AC export limit, and approval conditions |
| Tax measure | [Revenue Department Royal Decree No. 805 (PDF)](https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf) | Qualifying-expenditure cap and conditions; excluded from calculations and never presented as a cash refund |

## Solar-resource source

[European Commission Joint Research Centre PVGIS](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en) and its [non-interactive API documentation](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en) are the primary basis for the province-level yield anchors. The current model stores reviewed annual planning values rather than calling PVGIS from the visitor’s browser. This avoids transmitting the typed address and keeps the result reproducible.

The province anchors are not roof simulations. Direction, slope, and observable shade are applied as explicit model factors, while a real site survey remains necessary.

## Market-price evidence

Planning price anchors were triangulated from publicly listed cash package material available during May–August 2026, including:

- [GRoof May 2026 package brochure (PDF)](https://groof-public.s3.ap-southeast-1.amazonaws.com/pdfs/GRoofPackage_Brochure_May2026.pdf)
- [PEA Shopping 5 kW Standard](https://peashopping.com/product/pea-solar-5kw-1-phase-standard-package/)
- [PEA Shopping 5 kW Premium](https://peashopping.com/product/pea-solar-5kw-1-phase-premium-package/)
- [PEA Shopping 10 kW Standard](https://peashopping.com/product/pea-solar-10kw-3-phase-standard-package/)
- [PEA Shopping 10 kW Premium](https://peashopping.com/product/pea-solar-10kw-3-phase-premium-package/)

These are observations, not endorsements and not a claim that every package contains identical equipment, structural scope, utility work, warranties, or VAT treatment. The UI therefore calls the interpolated result a planning cash price, not a quotation. A user-supplied comparable quote can replace it.

## Transitional assumptions requiring further validation

The following are explicit product assumptions, not official Thai household interval datasets:

- load-profile target shares;
- self-consumption ratios;
- direction/slope and observable-shade factors;
- monthly production distribution;
- routine upkeep allowances;
- inverter replacement timing and reserve;
- roof-area capacity categories.

Buyer interviews, installer quotations, household interval data, and site-survey feedback should refine these values. Until then, confidence gating and disclosures prevent them from being presented as certainty.

## Review policy

Before a public advertising campaign or real lead collection:

1. Recheck every tariff, Ft, surplus-purchase, tax, and price source.
2. Replace expired schedules rather than silently extending them.
3. Review the model version and regression fixtures.
4. Revalidate Thai wording with a native legal/product reviewer.
5. Record the date, source, and reason for every material change.
