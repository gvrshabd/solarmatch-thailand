import { initialLoadingFactSet } from '@/config/loading-facts';
import type { PublicLoadingFact } from './types';

/** Correct the current display without rewriting historic fact-set records. */
export function currentPublicFact(fact: PublicLoadingFact | null): PublicLoadingFact | null {
  if (!fact || fact.id === 'patio-gardens') return null;
  if (fact.id !== 'home-value') return fact;
  const corrected = initialLoadingFactSet.facts.find((candidate) => candidate.id === 'home-value');
  if (!corrected) return null;
  return { ...fact, title: corrected.title, copy: corrected.copy, reference: corrected.reference };
}

export function currentPublicFacts(facts: PublicLoadingFact[]): PublicLoadingFact[] {
  return facts.map(currentPublicFact).filter((fact): fact is PublicLoadingFact => Boolean(fact));
}
