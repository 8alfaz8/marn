import { redirect } from 'next/navigation';
import { getStaffSession, roleHome } from '@/lib/authz';
import { getCoachScheduleToday } from '@/lib/actions/bookings';
import { getCoachMembers } from '@/lib/actions/members';
import { getImpersonationContext } from '@/lib/actions/impersonation';
import StaffChrome from '@/components/StaffChrome';
import CoachConsole from '@/components/coach/CoachConsole';
import { copy } from '@/components/coach/copy';

/* Role gate is server-side and route-level (Iron Rule: authorization is
   server-side, always) — the per-read checks in lib/authz still run on every
   action underneath it; this is the front door, not the lock. */
export default async function CoachPage() {
  const session = await getStaffSession();
  if (!session) redirect('/login');
  if (session.role !== 'coach') redirect(roleHome(session.role));

  const [schedule, roster, impersonation] = await Promise.all([
    getCoachScheduleToday(),
    getCoachMembers(),
    getImpersonationContext(),
  ]);

  /* Narrowed field by field on the way to the client, not spread: a booking
     row carries `aed` and a manager's member row carries phone/email, and
     neither may reach a coach's browser (docs/adr/0008). */
  const bookings = schedule.map((b) => ({
    id: b.id,
    memberId: b.memberId,
    serviceId: b.serviceId,
    time: b.time,
    status: b.status,
  }));
  const members = roster.map((m) => ({
    id: m.id,
    name: m.name,
    parqCleared: m.parqCleared,
    hasOpenFlag: 'hasOpenFlag' in m ? m.hasOpenFlag : false,
  }));

  return (
    <StaffChrome title={copy.chromeTitle} staffName={session.name} role="coach" impersonation={impersonation}>
      <CoachConsole staffName={session.name} bookings={bookings} members={members} />
    </StaffChrome>
  );
}
