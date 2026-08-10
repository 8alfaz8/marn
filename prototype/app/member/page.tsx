import { redirect } from 'next/navigation';
import { getIdentity } from '@/lib/session';
import Member from '@/components/Member';

export default async function MemberPage() {
  const who = await getIdentity();
  if (!who || who.kind !== 'member') redirect('/');
  return <Member memberId={who.id} />;
}
