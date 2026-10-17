/** Auditable regional reference. This does not use the household's map coordinates. */
export const solarResourceV3 = {
  id: 'jrc-pvgis-5.3-era5-bangkok-2026-10-17',
  provider: 'European Commission Joint Research Centre · PVGIS 5.3',
  sourceUrl: 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=13.75&lon=100.5&peakpower=1&loss=14&angle=15&aspect=0&pvtechchoice=crystSi&mountingplace=building&outputformat=json&usehorizon=1&raddatabase=PVGIS-ERA5',
  retrievedDate: '2026-10-17',
  expiresAt: null, // Historical climate reference, not a current-generation forecast or offer.
  responseSnapshot: 'docs/calculator-v3/pvgis-era5-bangkok-2026-10-17.json',
  reproductionScript: 'scripts/reproduce-solar-resource-v3.ps1',
  latitudeDegrees: 13.75,
  longitudeDegrees: 100.5,
  elevationMetres: 9,
  radiationDatabase: 'PVGIS-ERA5',
  meteorologicalDatabase: 'ERA5',
  firstWeatherYear: 2005,
  lastWeatherYear: 2023,
  horizon: 'DEM-calculated',
  useHorizon: true,
  panelTiltDegrees: 15,
  /** PVGIS azimuth uses south=0; the calculator uses compass south=180. */
  pvgisAzimuthDegrees: 0,
  panelCompassAzimuthDegrees: 180,
  mountingType: 'building-integrated',
  moduleTechnology: 'c-Si',
  referenceDcKwp: 1,
  systemLossPercent: 14,
  annualYieldKwhPerKwp: 1398.23,
  monthlyYieldKwhPerKwp: [131.07, 123.93, 137.39, 125.83, 114.89, 104.78, 101.73, 105.48, 99.74, 109.5, 116.88, 127] as const,
  /** Source monthly values are rounded; their sum differs from E_y by 0.01 kWh. */
  roundedMonthlyTotalKwhPerKwp: 1398.22,
  totalLossPercent: -27.83,
  incidenceLossPercent: -2.66,
  spectralLossPercent: 0.86,
  temperatureAndIrradianceLossPercent: -14.53,
  annualInterannualStandardDeviationKwh: 27.48,
} as const;

/** Preserve source E_y, distributing its 0.01-kWh rounding difference proportionally. */
export const solarResourceMonthlyShares: readonly number[] = solarResourceV3.monthlyYieldKwhPerKwp.map(
  value => value / solarResourceV3.roundedMonthlyTotalKwhPerKwp,
);
