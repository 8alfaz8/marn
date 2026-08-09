import { redirect } from 'next/navigation';
import { getIdentity } from '@/lib/session';
import Gate from '@/components/Gate';

export default async function GatePage() {
  const who = await getIdentity();
  if (who?.kind === 'member') redirect('/member');
  if (who?.kind === 'coach') redirect('/coach');
  if (who?.kind === 'admin') redirect('/admin');
  return <Gate />;
}
