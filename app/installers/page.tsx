import { InstallerPortal } from '@/components/installers/portal';
import { installerPublicConfig } from '@/lib/installer/public-config';
export const dynamic = 'force-dynamic';
export default async function Page() { return <InstallerPortal publicConfig={await installerPublicConfig()} />; }
