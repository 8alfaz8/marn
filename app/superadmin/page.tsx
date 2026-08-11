import { redirect } from 'next/navigation';
import StaffChrome from '@/components/StaffChrome';
import SuperadminConsole from '@/components/superadmin/SuperadminConsole';
import { copy } from '@/components/superadmin/copy';
import { getStaffSession, roleHome } from '@/lib/authz';
import { getSuperadminDashboard } from '@/lib/actions/dashboard';
import { getCoachWorkload } from '@/lib/actions/coachWorkload';
import { getCashLedger } from '@/lib/actions/cashLedger';
import { getAllStaff, getSites } from '@/lib/actions/staff';
import { getImpersonationContext } from '@/lib/actions/impersonation';

/* The superadmin's own surface — a third route tree alongside /coach and
   /studio, same pattern (docs/adr/0011). Every read below re-authorizes
   server-side in its own action; this redirect is navigation, not the
   authorization boundary. */
export default async function SuperadminPage() {
  const session = await getStaffSession();
  if (!session) redirect('/login');
  if (session.role !== 'superadmin') redirect(roleHome(session.role));

  const [dashboard, workload, ledger, sites, staff, impersonation] = await Promise.all([
    getSuperadminDashboard(),
    getCoachWorkload(),
    getCashLedger(),
    getSites(),
    getAllStaff(),
    getImpersonationContext(),
  ]);

  return (
    <StaffChrome title={copy.chromeTitle} staffName={session.name} role="superadmin" impersonation={impersonation}>
      <SuperadminConsole dashboard={dashboard} workload={workload} ledger={ledger} sites={sites} staff={staff} />
    </StaffChrome>
  );
}
