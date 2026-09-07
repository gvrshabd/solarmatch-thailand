import { featureFlags } from '@/config/feature-flags';
import type { AnalyticsEvents } from './events';

export function track<EventName extends keyof AnalyticsEvents>(event: EventName, properties: AnalyticsEvents[EventName]) {
  if (!featureFlags.FEATURE_ANALYTICS) return;
  void event;
  void properties;
  // Provider intentionally deferred. Never add name, phone, LINE ID, address or free text here.
}
