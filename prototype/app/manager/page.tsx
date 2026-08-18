import { redirect } from 'next/navigation';
import { getIdentity } from '@/lib/session';
import Manager from '@/components/Manager';

export default async function ManagerPage() {
  const who = await getIdentity();
  if (!who || who.kind !== 'manager') redirect('/');
  return <Manager managerId={who.id} />;
}
