import { InstallerPortal } from '@/components/installers/portal';
import { installerPublicConfig } from '@/lib/installer/public-config';
export const dynamic='force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <InstallerPortal deliveryId={id} publicConfig={await installerPublicConfig()} />; }
