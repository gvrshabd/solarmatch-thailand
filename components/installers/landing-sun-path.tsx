'use client';

import { Mail, MessageCircle } from 'lucide-react';
import { SunPath } from '@/components/shared/sun-path';
import { signalLandingText } from './signal-landing-copy';

export { sunPathProgress, sunPathLitSteps } from '@/components/shared/sun-path';

/** Installer landing: the shared sun path with the installer titles and the LINE / email note under step 2. */
export function LandingSunPath({ en }: { en: boolean }) {
  const t = signalLandingText(en);
  return <SunPath
    titles={[t.s1, t.s2, t.s3]}
    note={<p className="st-ic"><span className="chip-line" aria-hidden="true"><MessageCircle className="i"/></span><span className="chip-mail" aria-hidden="true"><Mail className="i"/></span><span>{t.s2p}</span></p>}
  />;
}
