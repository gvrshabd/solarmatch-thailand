'use client';

import { useEffect } from 'react';

export function InstallerAppRegistration() {
  useEffect(() => {
    if (window.isSecureContext && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/installers/installer-app-worker.js', {
        scope: '/installers/app', updateViaCache: 'none',
      }).catch(() => { /* Private browsing and some embedded browsers disable workers. */ });
    }
  }, []);
  return null;
}
