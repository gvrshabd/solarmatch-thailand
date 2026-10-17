import Link from '@/components/site/internal-link';
import { headers } from 'next/headers';
import { authenticateAdmin } from '@/lib/server/admin-auth';
import { HomeownerV3ReleasePanel } from '@/components/admin/homeowner-v3-release-panel';

export const dynamic = 'force-dynamic';

export default async function HomeownerV3ReleasePage() {
  const identity = await authenticateAdmin(await headers());
  if (!identity) return <main className="admin-access-denied"><div><h1>Access denied</h1><p>This private SolarMatch release control requires an approved Cloudflare Access administrator.</p></div></main>;
  return <main className="admin-main"><Link href="/admin">Back to administration</Link><HomeownerV3ReleasePanel /></main>;
}
