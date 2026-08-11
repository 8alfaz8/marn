import { redirect } from 'next/navigation';
import { getStaffSession, roleHome } from '@/lib/authz';

/* Not a landing page — routes straight to the right console, or /login.
   Three staff-facing surfaces with different route trees (docs/adr/0008,
   docs/adr/0011), not a shared screen with a role flag. */
export default async function Home() {
  const session = await getStaffSession();
  if (!session) redirect('/login');
  redirect(roleHome(session.role));
}
