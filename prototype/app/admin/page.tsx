import { redirect } from 'next/navigation';
import { getIdentity } from '@/lib/session';
import Admin from '@/components/Admin';

export default async function AdminPage() {
  const who = await getIdentity();
  if (!who || who.kind !== 'admin') redirect('/');
  return <Admin />;
}
