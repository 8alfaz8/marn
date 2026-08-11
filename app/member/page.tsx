import { redirect } from 'next/navigation';
import { getMemberSession } from '@/lib/memberAuth';
import { getMyPortalData } from '@/lib/actions/memberSelf';
import MemberChrome from '@/components/member/MemberChrome';
import MemberConsole from '@/components/member/MemberConsole';

/* Server-side session/role gate (Iron Rule: authorization is server-side,
   always) — mirrors app/coach/page.tsx's own front-door pattern, against
   lib/memberAuth.ts instead of lib/authz.ts. */
export default async function MemberPage() {
  const session = await getMemberSession();
  if (!session) redirect('/member/login');

  const data = await getMyPortalData();

  return (
    <MemberChrome name={session.name}>
      <MemberConsole data={data} parqCleared={session.parqCleared} referredToDoctor={session.referredToDoctor} />
    </MemberChrome>
  );
}
