'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Public-only design boundary: admin keeps its existing tokens and layout. */
export function PublicDesignShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={pathname.startsWith('/admin') ? undefined : 'terrace-public'}>{children}</div>;
}
