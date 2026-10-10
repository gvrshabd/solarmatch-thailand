import { InstallerPortal } from '@/components/installers/portal';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <InstallerPortal deliveryId={id} />; }
