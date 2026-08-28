import type { EstimateLocation } from '@/lib/calculator/types';

export type MapProvince = {
  value: string;
  th: string;
  en: string;
  center: { latitude: number; longitude: number };
  bounds?: { north: number; south: number; east: number; west: number };
  addressPatterns: RegExp[];
};

export const mapProvider = {
  id: 'openstreetmap-standard',
  label: 'OpenStreetMap',
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
  policyUrl: 'https://operations.osmfoundation.org/policies/tiles/',
  sendsTypedAddress: false,
  hasGeocoder: false,
  hasSatellite: false,
} as const;

export const mapProvinces: MapProvince[] = [
  {
    value: 'bangkok', th: 'กรุงเทพมหานคร', en: 'Bangkok', center: { latitude: 13.7563, longitude: 100.5018 },
    bounds: { north: 13.955, south: 13.493, east: 100.938, west: 100.327 },
    addressPatterns: [/กรุงเทพ(?:มหานคร)?/i, /กทม\.?/i, /bangkok/i],
  },
  {
    value: 'nonthaburi', th: 'นนทบุรี', en: 'Nonthaburi', center: { latitude: 13.8621, longitude: 100.5144 },
    bounds: { north: 14.14, south: 13.79, east: 100.57, west: 100.26 },
    addressPatterns: [/นนทบุรี/i, /nonthaburi/i],
  },
  {
    value: 'pathum-thani', th: 'ปทุมธานี', en: 'Pathum Thani', center: { latitude: 14.0208, longitude: 100.525 },
    bounds: { north: 14.29, south: 13.86, east: 100.95, west: 100.32 },
    addressPatterns: [/ปทุมธานี/i, /pathum\s*thani/i],
  },
  {
    value: 'samut-prakan', th: 'สมุทรปราการ', en: 'Samut Prakan', center: { latitude: 13.5991, longitude: 100.5998 },
    bounds: { north: 13.72, south: 13.43, east: 100.96, west: 100.45 },
    addressPatterns: [/สมุทรปราการ/i, /samut\s*prakan/i],
  },
  {
    value: 'other', th: 'จังหวัดอื่น', en: 'Another province', center: { latitude: 13.1, longitude: 101.2 },
    addressPatterns: [],
  },
];

export function inferProvinceFromAddress(address: string) {
  return mapProvinces.find((province) => province.addressPatterns.some((pattern) => pattern.test(address)))?.value ?? 'other';
}

export function inferProvinceFromCoordinates(latitude: number, longitude: number) {
  return mapProvinces.find((province) => province.bounds
    && latitude <= province.bounds.north
    && latitude >= province.bounds.south
    && longitude <= province.bounds.east
    && longitude >= province.bounds.west)?.value ?? 'other';
}

export function provinceCenter(province: string) {
  return (mapProvinces.find((candidate) => candidate.value === province) ?? mapProvinces[4]).center;
}

export function makeInitialLocation(address: string): EstimateLocation {
  const province = inferProvinceFromAddress(address);
  const center = provinceCenter(province);
  return { address, ...center, province, source: 'manual-map', confirmed: false };
}
