'use client';
import { useSyncExternalStore } from 'react';

/** The iOS and Android shells append this token to the WebView user agent. */
export const storeAppAgent = /SolarMatchInstallers\/(?:iOS|Android)/;

export function isStoreApp(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  return storeAppAgent.test(userAgent);
}

const noSubscription = () => () => undefined;
/**
 * True inside the App Store and Google Play builds. Those builds are companion apps to the paid
 * web portal: they show balances and history but offer no purchase and no call to buy elsewhere
 * (App Review Guideline 3.1.3(f); Google Play consumption-only apps). The browser portal and the
 * installable web app keep the existing purchase flow.
 */
export function useStoreApp() {
  return useSyncExternalStore(noSubscription, () => isStoreApp(), () => false);
}
