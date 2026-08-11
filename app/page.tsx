import { redirect } from 'next/navigation';
import { getStaffSession } from '@/lib/authz';

/* Not a landing page — routes straight to the right console, or /login.
   Two staff-facing surfaces with different route trees (docs/adr/0008),
   not a shared screen with a role flag. */
export default async function Home() {
  const session = await getStaffSession();
  if (!session) redirect('/login');
  redirect(session.role === 'studio_manager' ? '/studio' : '/coach');
}
