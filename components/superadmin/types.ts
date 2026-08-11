import type { getSuperadminDashboard } from '@/lib/actions/dashboard';
import type { getCoachWorkload } from '@/lib/actions/coachWorkload';
import type { getCashLedger } from '@/lib/actions/cashLedger';
import type { getAllStaff, getSites } from '@/lib/actions/staff';

/* Row shapes derived from the read actions rather than restated — same
   pattern as components/studio/types.ts. */

export type SuperadminDashboard = Awaited<ReturnType<typeof getSuperadminDashboard>>;
export type CoachWorkload = Awaited<ReturnType<typeof getCoachWorkload>>;
export type CashLedger = Awaited<ReturnType<typeof getCashLedger>>;
export type Site = Awaited<ReturnType<typeof getSites>>[number];
export type AllStaff = Awaited<ReturnType<typeof getAllStaff>>[number];
