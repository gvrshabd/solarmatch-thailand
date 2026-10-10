import Link from 'next/link';
import { headers } from 'next/headers';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { authenticateAdmin, createCsrfToken, localAdminAvailable } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const requestHeaders = await headers();
  const identity = await authenticateAdmin(requestHeaders);
  if (!identity) return <main className="admin-access-denied"><div><h1>Access denied</h1><p>This private SolarMatch administration area requires an approved Cloudflare Access identity.</p>{localAdminAvailable(requestHeaders.get('host')) && <p><Link href="/admin/local-access">Synthetic local test administrator sign in</Link></p>}</div></main>;
  let csrfToken = '';
  try { csrfToken = await createCsrfToken(identity); } catch { /* Dashboard shows a fail-closed security warning. */ }
  return <><AdminDashboard csrfToken={csrfToken} signedInEmail={identity.email} />{identity.subject === 'local-synthetic-administrator' && <form action="/admin/api/local-session" method="post"><input type="hidden" name="action" value="logout" /><button type="submit">Sign out of synthetic local administrator</button></form>}</>;
}
