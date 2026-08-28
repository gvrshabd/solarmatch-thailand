# Address and map privacy

Last reviewed: **2026-08-28**

## Current design

The estimator asks for the home address first because location can improve province selection and later support roof-specific work. The typed address is treated as personal information.

In the current prototype:

- the address text is never sent to SolarMatch, an installer, an analytics service, a geocoder, a database, a URL, or a log by application code;
- address, coordinates, and calculator answers are held in `sessionStorage`, so they survive a refresh and language switch within the tab and are removed when the user clears the estimate or the browser session ends;
- the user positions and confirms a marker manually;
- simple province names in Thai or English are matched locally to choose an initial map centre;
- the browser asks for device location only after the user presses “Use my current location”; and
- no contact details are stored with the estimate.

## Map provider and data flow

The interactive map uses Leaflet with standard OpenStreetMap tiles:

- Tile URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/)
- [OpenStreetMap privacy policy](https://osmfoundation.org/wiki/Privacy_Policy)
- [Leaflet licence](https://github.com/Leaflet/Leaflet/blob/main/LICENSE)

Opening the map sends tile requests to OpenStreetMap. As described next to the map, the tile service receives normal request data such as IP address, referrer, and the map tiles viewed. Tile coordinates reveal the approximate area being viewed. The literal address text is not included in those requests. OpenStreetMap attribution remains visible.

The map does not prefetch tiles, scrape tiles, use offline bulk downloading, or hide attribution. If tiles fail, the estimator retains keyboard/touch position controls and a province-level fallback.

## Why exact-address autocomplete is not active

The public [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) prohibits client-side autocomplete, limits request rates, and warns against submitting personal or confidential data. Sending exact home addresses there would conflict with the prototype’s privacy posture. It is therefore not used.

Commercial geocoders can offer better address search and roof imagery, but they require an account, API key, contract, billing policy, privacy review, and often data-retention disclosures. None has been connected. Satellite imagery is also intentionally absent because no fully free option with sufficiently clear production licensing, service terms, and privacy handling was validated for this release.

The honest trade-off is a user-confirmed marker rather than pretending province-centre inference is exact geocoding.

## Current-location behavior

Geolocation is never requested on page load. It is called only after a direct button press, so the browser controls the permission prompt. Denial or failure does not block the estimator. The returned coordinates remain session-only in application storage, though opening map tiles around those coordinates necessarily reveals the viewed area to the tile provider.

## Before production lead collection

Any future exact-address geocoder, aerial imagery provider, database, lead form, or installer handoff requires:

- a named data controller and processor inventory;
- a provider contract and lawful data-use review;
- production privacy and consent wording in Thai and English;
- retention and deletion rules;
- restricted access and security controls;
- prevention of address leakage into URLs, logs, analytics, or error reports; and
- a separate approval before activation.
