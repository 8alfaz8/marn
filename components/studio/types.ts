import type { getManagerDashboard } from '@/lib/actions/dashboard';
import type { getManagerMembers } from '@/lib/actions/members';
import type { getStaffRoster } from '@/lib/actions/staff';
import type { getUpcomingShifts } from '@/lib/actions/shifts';

/* Row shapes are derived from the read actions rather than restated, so a
   query-layer change surfaces here as a type error instead of a silently
   stale prop. Type-only imports — nothing from a 'use server' module is
   pulled into the client bundle. */

export type Dashboard = Awaited<ReturnType<typeof getManagerDashboard>>;
export type Booking = Dashboard['todaySchedule'][number];
export type Member = Awaited<ReturnType<typeof getManagerMembers>>[number];
export type StaffMember = Awaited<ReturnType<typeof getStaffRoster>>[number];
export type Shift = Awaited<ReturnType<typeof getUpcomingShifts>>[number];
