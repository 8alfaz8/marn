import { redirect } from 'next/navigation';
import { getStaffSession, roleHome } from '@/lib/authz';
import { getMemberSession } from '@/lib/memberAuth';

/* Not a landing page — routes straight to the right console. Root `/`
   stays the staff front door (unchanged); a signed-in member lands on
   /member instead of falling through to staff /login (docs/adr/0014) —
   checked second since staff and members share one session cookie and a
   staff session should never accidentally read as "no session, check
   member". */
export default async function Home() {
  const session = await getStaffSession();
  if (session) redirect(roleHome(session.role));

  const memberSession = await getMemberSession();
  if (memberSession) redirect('/member');

  redirect('/login');
}
