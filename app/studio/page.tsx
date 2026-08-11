import { redirect } from 'next/navigation';
import StaffChrome from '@/components/StaffChrome';
import StudioConsole from '@/components/studio/StudioConsole';
import { getStaffSession } from '@/lib/authz';
import { getManagerDashboard } from '@/lib/actions/dashboard';
import { getManagerMembers } from '@/lib/actions/members';
import { getCoaches, getStaffRoster } from '@/lib/actions/staff';
import { getUpcomingShifts } from '@/lib/actions/shifts';

/* The studio manager's own surface — a separate route tree from /coach, each
   authorized to its own role, never one screen branching on a role flag
   (docs/adr/0008). Every read below re-authorizes server-side in its own
   action; this redirect is navigation, not the authorization boundary.

   `getManagerScheduleToday` is not called here: `getManagerDashboard` already
   returns today's bookings alongside the counts, and a second identical read
   would only add a round-trip. */
export default async function StudioPage() {
  const session = await getStaffSession();
  if (!session) redirect('/login');
  if (session.role !== 'studio_manager') redirect('/coach');

  const [dashboard, members, staff, coaches, shifts] = await Promise.all([
    getManagerDashboard(),
    getManagerMembers(),
    getStaffRoster(),
    getCoaches(),
    getUpcomingShifts(),
  ]);

  return (
    <StaffChrome title="Studio operations" staffName={session.name} role="studio_manager">
      <StudioConsole
        dashboard={dashboard}
        members={members}
        staff={staff}
        coaches={coaches}
        shifts={shifts}
      />
    </StaffChrome>
  );
}
