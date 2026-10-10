import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { localAdminAvailable } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

export default async function LocalAdminAccess({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!localAdminAvailable((await headers()).get('host'))) notFound();
  const { error } = await searchParams;
  return <main className="admin-access-denied"><div><h1>Synthetic local test administrator</h1><p>This access works only with the isolated loopback test configuration. Use the generated password in the ignored local test keys file.</p>{error && <p role="alert">Sign in failed. Check the local test password.</p>}<form action="/admin/api/local-session" method="post"><label htmlFor="local-admin-password">Local test password</label><input id="local-admin-password" name="password" type="password" required autoComplete="off" minLength={32} /><button type="submit">Sign in</button></form></div></main>;
}
