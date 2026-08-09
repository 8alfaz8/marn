import { redirect } from 'next/navigation';
import { getIdentity } from '@/lib/session';
import Coach from '@/components/Coach';

export default async function CoachPage() {
  const who = await getIdentity();
  if (!who || who.kind !== 'coach') redirect('/');
  return <Coach coachId={who.id} />;
}
