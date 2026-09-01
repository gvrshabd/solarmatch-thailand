import type { LocalizedText } from '@/lib/questionnaire/types';

export type LoadingFactReference = {
  citation: string;
  fullReference: string;
  url: string;
  context: LocalizedText;
};

export type LoadingFact = {
  id: string;
  title: LocalizedText;
  copy: LocalizedText;
  alt: LocalizedText;
  sketchSource: 'built-in' | 'media';
  sketchId: string | null;
  mediaId: string | null;
  resourcesAnchor: string;
  reference: LoadingFactReference;
  enabled: boolean;
  weight: number;
  reviewedOn: string;
};

export type LoadingFactSet = {
  id: string;
  schemaVersion: 1;
  facts: LoadingFact[];
};

export type PublicLoadingFact = LoadingFact & {
  imageUrl: string;
};
