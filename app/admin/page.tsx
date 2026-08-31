import { headers } from 'next/headers';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { authenticateAdmin, createCsrfToken } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const identity = await authenticateAdmin(await headers());
  if (!identity) return <main className="admin-access-denied"><div><h1>Access denied</h1><p>This private SolarMatch administration area requires an approved Cloudflare Access identity.</p></div></main>;
  let csrfToken = '';
  try { csrfToken = await createCsrfToken(identity); } catch { /* Dashboard shows a fail-closed security warning. */ }
  return <AdminDashboard csrfToken={csrfToken} signedInEmail={identity.email} />;
}
