import type { PublicLoadingFact } from './types';

export const loadingFactHistoryKey = 'solarmatch:loading-fact-history';

function secureIndex(maximum: number) {
  if (maximum <= 1) return 0;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % maximum;
}

export function loadingDurationMs() {
  return 3_000 + secureIndex(2_001);
}

export function selectLoadingFact(facts: PublicLoadingFact[], recentIds: string[]) {
  const enabled = facts.filter((fact) => fact.enabled && fact.weight > 0);
  if (!enabled.length) return null;
  const latest = recentIds.at(-1);
  const candidates = enabled.length > 1 ? enabled.filter((fact) => fact.id !== latest) : enabled;
  const weighted = candidates.flatMap((fact) => Array.from({ length: Math.min(20, fact.weight) }, () => fact));
  return weighted[secureIndex(weighted.length)] ?? candidates[0];
}

export function nextFactHistory(recentIds: string[], selectedId: string) {
  return [...recentIds.filter((id) => id !== selectedId), selectedId].slice(-5);
}
